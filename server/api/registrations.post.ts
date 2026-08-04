import { randomBytes, randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { eq, and, inArray, asc } from 'drizzle-orm'
import { useDb, schema } from '../database/client'
import { registrationSchema } from '../utils/validation'
import { sendMail, inviteEmail, leaderConfirmationEmail, leaderVerifyEmail } from '../utils/email'
import { useUploads, contentTypeFor, APPLICATION_PREFIX } from '../utils/storage'
import { sniffApplicationFile, APPLICATION_MAX_SIZE } from '../utils/fileSniff'

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
const VERIFY_TTL_MS = 48 * 60 * 60 * 1000 // 48 hours

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
// accounts: the leader becomes an active account immediately (they chose a
// password in the form); each teammate gets an invited account and an email
// with a set-password link plus their personal check-in QR code.
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

  if (!sessionParticipant && !body.password) {
    throw createError({ statusCode: 400, statusMessage: 'Choose a dashboard password to finish registering.' })
  }

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

  const answerByFieldId = new Map(body.answers.map((a) => [a.fieldId, a.value]))
  const sniffedFiles = new Map<number, { data: Buffer; ext: string; mime: string; filename: string }>()
  for (const field of applicationFields) {
    if (field.fieldType === 'file') {
      const part = fileParts.get(field.id)
      if (!part) {
        if (field.required) throw createError({ statusCode: 400, statusMessage: `${field.label} is required.` })
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
      if (field.required && !value) {
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
  const allEmails = [leaderEmail, ...memberEmails]
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

  // Leader: create the account with the chosen password, but not as 'active'
  // yet — nothing so far has proven they own this inbox (unlike a teammate,
  // who must click an emailed link to ever get a password at all). A fresh
  // account, or one that only ever existed as an *invited* teammate, goes to
  // 'pending' with an email-verify token; login already rejects anything
  // short of 'active', so an unverified leader simply cannot sign in yet. An
  // account that is already 'active' (entering another competition) is left
  // untouched — it was verified the first time and does not need to be again.
  let leader = await findAccount(leaderEmail)
  let newlyPending = false
  if (!leader) {
    const passwordHash = await bcrypt.hash(body.password!, 12)
    ;[leader] = await db
      .insert(schema.participantAccounts)
      .values({
        email: leaderEmail,
        passwordHash,
        fullName: body.fullName,
        phone: body.phone,
        status: 'pending',
        emailVerifyToken: randomBytes(32).toString('hex'),
        emailVerifyExpires: new Date(Date.now() + VERIFY_TTL_MS).toISOString(),
        checkinToken: randomBytes(24).toString('hex'),
      })
      .returning()
    newlyPending = true
  } else if (!leader.passwordHash || leader.status !== 'active') {
    const passwordHash = await bcrypt.hash(body.password!, 12)
    ;[leader] = await db
      .update(schema.participantAccounts)
      .set({
        passwordHash,
        status: 'pending',
        inviteToken: null,
        inviteExpires: null,
        emailVerifyToken: randomBytes(32).toString('hex'),
        emailVerifyExpires: new Date(Date.now() + VERIFY_TTL_MS).toISOString(),
        fullName: body.fullName,
        phone: body.phone,
      })
      .where(eq(schema.participantAccounts.id, leader.id))
      .returning()
    newlyPending = true
  }
  await db
    .insert(schema.teamMembers)
    .values({ registrationId: registration!.id, competitionId: comp.id, accountId: leader!.id, role: 'leader' })
    .onConflictDoNothing()

  const invites: { account: typeof leader; name: string }[] = []
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
    await db
      .insert(schema.teamMembers)
      .values({ registrationId: registration!.id, competitionId: comp.id, accountId: account!.id, role: 'member' })
      .onConflictDoNothing()
    invites.push({ account, name: m.name })
  }

  // ---- Emails (console transport in dev; Resend when key is set). Failures
  // are logged inside sendMail and never break the registration. Awaited (not
  // fire-and-forget): Workers can kill unawaited work once the response is
  // sent, which silently dropped these sends in production. ----
  const teamName = registration!.teamName ?? ''
  const leaderMail = newlyPending
    ? await leaderVerifyEmail({ name: leader!.fullName, teamName, competition: comp.name, verifyToken: leader!.emailVerifyToken!, checkinToken: leader!.checkinToken })
    : await leaderConfirmationEmail({ name: leader!.fullName, teamName, competition: comp.name, checkinToken: leader!.checkinToken })
  await sendMail({ to: leader!.email, ...leaderMail }).catch(() => {})

  for (const { account, name } of invites) {
    if (!account) continue
    const mail = account.inviteToken
      ? await inviteEmail({ name, teamName, competition: comp.name, inviteToken: account.inviteToken, checkinToken: account.checkinToken })
      : // Existing active account added to a new team: no invite link needed.
        await leaderConfirmationEmail({ name, teamName, competition: comp.name, checkinToken: account.checkinToken })
    await sendMail({ to: account!.email, ...mail }).catch(() => {})
  }

  // The client needs to know whether the leader must verify before they can
  // log in, so it can show "check your email" instead of implying the
  // dashboard is ready right now.
  return { ok: true, verificationRequired: newlyPending }
})
