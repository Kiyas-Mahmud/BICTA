import { randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { eq, and, inArray } from 'drizzle-orm'
import { useDb, schema } from '../database/client'
import { registrationSchema } from '../utils/validation'
import { sendMail, inviteEmail, leaderConfirmationEmail } from '../utils/email'

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
  const body = await readValidatedBody(event, registrationSchema.parse)

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

  // ---- Provision participant accounts (leader active, members invited) ----

  // Returns a promise; call sites await it.
  const findAccount = (email: string) =>
    db.select().from(schema.participantAccounts).where(eq(schema.participantAccounts.email, email)).get()

  // Leader: create an active account with the chosen password. An existing
  // active account (from another competition) keeps its password — but an
  // account that only ever existed as an *invited* teammate has no password
  // yet, so activate it with the one just chosen. Without this the registration
  // succeeds while login keeps rejecting them, since auth requires
  // status === 'active' && passwordHash.
  let leader = await findAccount(leaderEmail)
  if (!leader) {
    const passwordHash = await bcrypt.hash(body.password!, 12)
    ;[leader] = await db
      .insert(schema.participantAccounts)
      .values({
        email: leaderEmail,
        passwordHash,
        fullName: body.fullName,
        phone: body.phone,
        status: 'active',
        checkinToken: randomBytes(24).toString('hex'),
      })
      .returning()
  } else if (!leader.passwordHash || leader.status !== 'active') {
    const passwordHash = await bcrypt.hash(body.password!, 12)
    ;[leader] = await db
      .update(schema.participantAccounts)
      .set({ passwordHash, status: 'active', inviteToken: null, fullName: body.fullName, phone: body.phone })
      .where(eq(schema.participantAccounts.id, leader.id))
      .returning()
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
  // are logged inside sendMail and never break the registration. ----
  const teamName = registration!.teamName ?? ''
  leaderConfirmationEmail({ name: leader!.fullName, teamName, competition: comp.name, checkinToken: leader!.checkinToken })
    .then((mail) => sendMail({ to: leader!.email, ...mail }))
    .catch(() => {})

  for (const { account, name } of invites) {
    if (!account) continue
    const build = account.inviteToken
      ? inviteEmail({ name, teamName, competition: comp.name, inviteToken: account.inviteToken, checkinToken: account.checkinToken })
      : // Existing active account added to a new team: no invite link needed.
        leaderConfirmationEmail({ name, teamName, competition: comp.name, checkinToken: account.checkinToken })
    build.then((mail) => sendMail({ to: account!.email, ...mail })).catch(() => {})
  }

  // Confirmation only — no stored data echoed back.
  return { ok: true }
})
