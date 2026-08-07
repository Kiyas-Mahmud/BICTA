import { randomBytes, randomUUID } from 'node:crypto'
import { eq, and, inArray, asc } from 'drizzle-orm'
import { useDb, schema } from '../database/client'
import { registrationSchema } from '../utils/validation'
import { sendMail, inviteEmail, leaderConfirmationEmail, leaderSetPasswordEmail } from '../utils/email'
import { useUploads, contentTypeFor, APPLICATION_PREFIX } from '../utils/storage'
import { sniffApplicationFile, APPLICATION_MAX_SIZE } from '../utils/fileSniff'
import { INVITE_TTL_MS, releaseExpiredInvites } from '../utils/invites'
import { applicationWindow } from '../utils/application'

// Public write endpoint. Handler order is the security contract
// (Security_Plan.md §6a): honeypot/time-trap → schema validation → business
// checks → insert. Keep it that way.
//
// Accepts both anonymous sign-ups and already-signed-in participants entering
// an additional competition. A participant may hold one team per competition
// and as many competitions as they like; the one-team rule is enforced here
// and again by the team_members (competition_id, account_id) unique index.
//
// After the registration row is stored this also provisions participant
// accounts. Nobody picks a password in the form: the leader and every
// teammate get an invited account plus an email carrying a set-password link
// and their personal check-in QR code. Following that link is what activates
// the account, and what proves the address belongs to them.
export default defineEventHandler(async (event) => {
  assertRateLimit(event, { bucket: 'register', max: 15, windowMs: 60 * 60 * 1000 })

  // Competitions with custom file-upload fields submit multipart/form-data (a
  // "payload" part carrying the JSON body, plus one "file_<fieldId>" part per
  // uploaded file). Every other competition sends the same plain JSON body as
  // before — this branch is the only thing that changes for them, and it's a
  // no-op.
  const contentType = getHeader(event, 'content-type') ?? ''
  const fileParts = new Map<number, { data: Buffer; filename: string }>()
  let body: ReturnType<typeof registrationSchema.parse>
  if (contentType.includes('multipart/form-data')) {
    const parts = await readMultipartFormData(event)
    const payloadPart = parts?.find((p) => p.name === 'payload')
    if (!payloadPart) throw createError({ statusCode: 400, statusMessage: 'Missing form payload' })
    let parsed: unknown
    try {
      parsed = JSON.parse(payloadPart.data.toString('utf8'))
    } catch {
      throw createError({ statusCode: 400, statusMessage: 'Invalid form payload' })
    }
    body = registrationSchema.parse(parsed)
    for (const p of parts ?? []) {
      if (p.name?.startsWith('file_') && p.data?.length) {
        const fieldId = Number(p.name.slice('file_'.length))
        if (Number.isInteger(fieldId)) fileParts.set(fieldId, { data: p.data, filename: p.filename ?? 'upload' })
      }
    }
  } else {
    body = await readValidatedBody(event, registrationSchema.parse)
  }

  // Honeypot: hidden "website" field must stay empty. Bots that fill it get a
  // fake success so they don't learn anything.
  if (body.website !== '') {
    return { ok: true }
  }

  // Time trap: the form token is its render timestamp; sub-3s submits are bots.
  const renderedAt = Number(body.formToken)
  if (!Number.isFinite(renderedAt) || Date.now() - renderedAt < 3000) {
    throw createError({ statusCode: 400, statusMessage: 'Submission rejected. Please try again.' })
  }

  // A signed-in participant always registers as themselves — never trust an
  // email typed into the form while a session is open.
  const session = await getUserSession(event)
  const sessionParticipant = (session as any)?.participant as { id: number; email: string } | undefined
  const leaderEmail = sessionParticipant?.email ?? body.email

  const db = useDb()
  const comp = await db.select().from(schema.competitions).where(eq(schema.competitions.id, body.competitionId)).get()
  if (!comp) throw createError({ statusCode: 404, statusMessage: 'Competition not found' })

  if (!comp.registrationOpen) {
    throw createError({ statusCode: 403, statusMessage: 'Registration is closed for this competition.' })
  }
  if (comp.registrationDeadline && new Date(`${comp.registrationDeadline}T23:59:59Z`) < new Date()) {
    throw createError({ statusCode: 403, statusMessage: 'The registration deadline has passed.' })
  }

  // Custom application fields for this competition. Validated fully in memory
  // — required-ness and file magic-byte sniffing — before any I/O (R2 or D1),
  // so a bad submission never leaves partial state behind.
  const applicationFields = await db
    .select()
    .from(schema.applicationFields)
    .where(eq(schema.applicationFields.competitionId, comp.id))
    .orderBy(asc(schema.applicationFields.sortOrder))

  // A field's own "required" only bites when the form as a whole is required
  // at registration time and its window is open. Otherwise answers are still
  // accepted here, but the team may equally leave them for their dashboard.
  const window = applicationWindow(comp)
  const mustComplete = comp.applicationRequired && window.state === 'open'

  const answerByFieldId = new Map(body.answers.map((a) => [a.fieldId, a.value]))
  const sniffedFiles = new Map<number, { data: Buffer; ext: string; mime: string; filename: string }>()
  for (const field of applicationFields) {
    if (field.fieldType === 'file') {
      const part = fileParts.get(field.id)
      if (!part) {
        if (field.required && mustComplete) throw createError({ statusCode: 400, statusMessage: `${field.label} is required.` })
        continue
      }
      if (part.data.length > APPLICATION_MAX_SIZE) {
        throw createError({ statusCode: 413, statusMessage: `${field.label}: file too large (max 10 MB).` })
      }
      const sniffed = sniffApplicationFile(part.data)
      if (!sniffed) {
        throw createError({ statusCode: 415, statusMessage: `${field.label}: only PDF, DOC, DOCX, JPG, PNG or WEBP files are allowed.` })
      }
      sniffedFiles.set(field.id, { data: part.data, ext: sniffed.ext, mime: sniffed.mime, filename: part.filename })
    } else {
      const value = answerByFieldId.get(field.id)?.trim()
      if (field.required && mustComplete && !value) {
        throw createError({ statusCode: 400, statusMessage: `${field.label} is required.` })
      }
    }
  }

  const teamMembers = comp.teamBased ? (body.teamMembers ?? []) : []
  if (teamMembers.length > comp.maxTeamSize - 1) {
    throw createError({ statusCode: 400, statusMessage: `Teams may have at most ${comp.maxTeamSize} members including you.` })
  }

  // Leader + teammates must be distinct people.
  const memberEmails = teamMembers.map((m) => m.email.toLowerCase())
  if (memberEmails.includes(leaderEmail) || new Set(memberEmails).size !== memberEmails.length) {
    throw createError({ statusCode: 400, statusMessage: 'Each team member needs a different email address.' })
  }

  // Invites that were never accepted inside the 24h window do not hold a seat.
  // Releasing them first means the two uniqueness checks below only ever see
  // people who completed setup or still have a live invite.
  const allEmails = [leaderEmail, ...memberEmails]
  const orphanedFiles = await releaseExpiredInvites(allEmails)
  if (orphanedFiles.length) {
    const uploads = useUploads(event)
    await Promise.all(
      orphanedFiles.map((url) => uploads.delete(`${APPLICATION_PREFIX}${url.split('/').pop()}`).catch(() => {})),
    )
  }

  const duplicate = await db
    .select({ id: schema.registrations.id })
    .from(schema.registrations)
    .where(and(eq(schema.registrations.competitionId, comp.id), eq(schema.registrations.email, leaderEmail)))
    .get()
  if (duplicate) {
    throw createError({ statusCode: 409, statusMessage: 'This email is already registered for this competition.' })
  }

  // One team per competition, for everyone on the entry. Checked up front so
  // the message can name the person instead of surfacing a bare index error.
  const clashes = await db
    .select({ email: schema.participantAccounts.email })
    .from(schema.teamMembers)
    .innerJoin(schema.participantAccounts, eq(schema.participantAccounts.id, schema.teamMembers.accountId))
    .where(and(eq(schema.teamMembers.competitionId, comp.id), inArray(schema.participantAccounts.email, allEmails)))
  if (clashes.length) {
    const who = clashes.map((c) => c.email)
    const isLeader = who.includes(leaderEmail)
    throw createError({
      statusCode: 409,
      statusMessage: isLeader
        ? `You are already on a team for ${comp.name}. Each person can join one team per competition.`
        : `Already on another team for ${comp.name}: ${who.join(', ')}. Each person can join one team per competition.`,
    })
  }

  // Upload every validated file before writing anything to D1, so an R2
  // outage fails the whole request cleanly with zero DB rows written. If a
  // later file in this same request fails, best-effort delete the ones that
  // already succeeded rather than leaving a half-uploaded application.
  const uploadedFiles = new Map<number, { url: string; filename: string; size: number; mime: string }>()
  if (sniffedFiles.size) {
    const uploads = useUploads(event)
    try {
      for (const [fieldId, file] of sniffedFiles) {
        const key = `${randomUUID()}.${file.ext}`
        await uploads.put(`${APPLICATION_PREFIX}${key}`, file.data, { httpMetadata: { contentType: contentTypeFor(key) } })
        uploadedFiles.set(fieldId, { url: `/applications/${key}`, filename: file.filename, size: file.data.length, mime: file.mime })
      }
    } catch {
      await Promise.all([...uploadedFiles.values()].map((f) => uploads.delete(`${APPLICATION_PREFIX}${f.url.split('/').pop()}`).catch(() => {})))
      throw createError({ statusCode: 500, statusMessage: 'Could not upload your files. Please try again.' })
    }
  }

  const [registration] = await db
    .insert(schema.registrations)
    .values({
      competitionId: comp.id,
      fullName: body.fullName,
      email: leaderEmail,
      phone: body.phone,
      institution: body.institution,
      teamName: comp.teamBased ? (body.teamName ?? null) : null,
      teamMembers: teamMembers.length ? teamMembers : null,
      notes: body.notes ?? null,
    })
    .returning()

  const responseRows = applicationFields
    .map((field) => {
      if (field.fieldType === 'file') {
        const file = uploadedFiles.get(field.id)
        if (!file) return null
        return { registrationId: registration!.id, fieldId: field.id, fileUrl: file.url, fileName: file.filename, fileSize: file.size, fileMime: file.mime }
      }
      const value = answerByFieldId.get(field.id)?.trim()
      if (!value) return null
      return { registrationId: registration!.id, fieldId: field.id, textValue: value }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
  if (responseRows.length) {
    await db.insert(schema.applicationResponses).values(responseRows)
  }

  // ---- Provision participant accounts (leader active, members invited) ----

  // Returns a promise; call sites await it.
  const findAccount = (email: string) =>
    db.select().from(schema.participantAccounts).where(eq(schema.participantAccounts.email, email)).get()

  // Leader: no password is collected in the form. The account starts without
  // one, as 'invited' plus an invite token, and the emailed set-password link
  // is what activates it — the same contract teammates already have. Choosing
  // the password through that link is what proves they own the inbox, so it
  // doubles as the email verification the old 'pending' + verify-token step
  // used to provide. Login rejects anything short of 'active', so a leader who
  // never opens the mail simply cannot sign in. An account that is already
  // 'active' (entering another competition) is left untouched — it was
  // verified the first time and does not need to be again.
  let leader = await findAccount(leaderEmail)
  let newlyPending = false
  if (!leader) {
    ;[leader] = await db
      .insert(schema.participantAccounts)
      .values({
        email: leaderEmail,
        fullName: body.fullName,
        phone: body.phone,
        status: 'invited',
        inviteToken: randomBytes(32).toString('hex'),
        inviteExpires: new Date(Date.now() + INVITE_TTL_MS).toISOString(),
        checkinToken: randomBytes(24).toString('hex'),
      })
      .returning()
    newlyPending = true
  } else if (!leader.passwordHash || leader.status !== 'active') {
    // Covers someone who was previously only ever invited as a teammate, and
    // re-issues a fresh link if an earlier one expired.
    ;[leader] = await db
      .update(schema.participantAccounts)
      .set({
        status: 'invited',
        inviteToken: randomBytes(32).toString('hex'),
        inviteExpires: new Date(Date.now() + INVITE_TTL_MS).toISOString(),
        emailVerifyToken: null,
        emailVerifyExpires: null,
        fullName: body.fullName,
        phone: body.phone,
      })
      .where(eq(schema.participantAccounts.id, leader.id))
      .returning()
    newlyPending = true
  }
  // The QR that goes in the email is this membership's, not the account's:
  // it has to identify which competition is being scanned. onConflictDoNothing
  // returns nothing when the row already exists, so fall back to reading it.
  const leaderToken =
    (
      await db
        .insert(schema.teamMembers)
        .values({ registrationId: registration!.id, competitionId: comp.id, accountId: leader!.id, role: 'leader', checkinToken: randomBytes(24).toString('hex') })
        .onConflictDoNothing()
        .returning({ checkinToken: schema.teamMembers.checkinToken })
    )[0]?.checkinToken ??
    (
      await db
        .select({ checkinToken: schema.teamMembers.checkinToken })
        .from(schema.teamMembers)
        .where(and(eq(schema.teamMembers.registrationId, registration!.id), eq(schema.teamMembers.accountId, leader!.id)))
        .get()
    )?.checkinToken ??
    leader!.checkinToken

  const invites: { account: typeof leader; name: string; checkinToken: string }[] = []
  for (const m of teamMembers) {
    let account = await findAccount(m.email.toLowerCase())
    if (!account) {
      ;[account] = await db
        .insert(schema.participantAccounts)
        .values({
          email: m.email.toLowerCase(),
          fullName: m.name,
          status: 'invited',
          inviteToken: randomBytes(32).toString('hex'),
          inviteExpires: new Date(Date.now() + INVITE_TTL_MS).toISOString(),
          checkinToken: randomBytes(24).toString('hex'),
        })
        .returning()
    }
    const memberToken =
      (
        await db
          .insert(schema.teamMembers)
          .values({ registrationId: registration!.id, competitionId: comp.id, accountId: account!.id, role: 'member', checkinToken: randomBytes(24).toString('hex') })
          .onConflictDoNothing()
          .returning({ checkinToken: schema.teamMembers.checkinToken })
      )[0]?.checkinToken ??
      (
        await db
          .select({ checkinToken: schema.teamMembers.checkinToken })
          .from(schema.teamMembers)
          .where(and(eq(schema.teamMembers.registrationId, registration!.id), eq(schema.teamMembers.accountId, account!.id)))
          .get()
      )?.checkinToken ??
      account!.checkinToken
    invites.push({ account, name: m.name, checkinToken: memberToken })
  }

  // ---- Emails (console transport in dev; Resend when key is set). Failures
  // are logged inside sendMail and never break the registration. Awaited (not
  // fire-and-forget): Workers can kill unawaited work once the response is
  // sent, which silently dropped these sends in production. ----
  const teamName = registration!.teamName ?? ''
  const leaderMail = newlyPending
    ? await leaderSetPasswordEmail({ name: leader!.fullName, teamName, competition: comp.name, inviteToken: leader!.inviteToken!, checkinToken: leaderToken })
    : await leaderConfirmationEmail({ name: leader!.fullName, teamName, competition: comp.name, checkinToken: leaderToken })
  await sendMail({ to: leader!.email, ...leaderMail }).catch(() => {})

  for (const { account, name, checkinToken } of invites) {
    if (!account) continue
    const mail = account.inviteToken
      ? await inviteEmail({ name, teamName, competition: comp.name, inviteToken: account.inviteToken, checkinToken })
      : // Existing active account added to a new team: no invite link needed.
        await leaderConfirmationEmail({ name, teamName, competition: comp.name, checkinToken })
    await sendMail({ to: account!.email, ...mail }).catch(() => {})
  }

  // The client needs to know whether the leader must verify before they can
  // log in, so it can show "check your email" instead of implying the
  // dashboard is ready right now.
  return { ok: true, verificationRequired: newlyPending }
})
