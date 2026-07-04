import { randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { eq, and } from 'drizzle-orm'
import { useDb, schema } from '../database/client'
import { registrationSchema } from '../utils/validation'
import { sendMail, inviteEmail, leaderConfirmationEmail } from '../utils/email'
import { qrDataUrl } from '../utils/qr'

// Public write endpoint. Handler order is the security contract
// (Security_Plan.md §6a): rate limit → honeypot/time-trap → schema validation
// → business checks → insert. Keep it that way.
//
// After the registration row is stored this also provisions participant
// accounts: the leader becomes an active account immediately (they chose a
// password in the form); each teammate gets an invited account and an email
// with a set-password link plus their personal check-in QR code.
export default defineEventHandler(async (event) => {
  assertRateLimit(event, { bucket: 'registration', max: 5, windowMs: 60 * 60 * 1000 })

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

  const db = useDb()
  const comp = db.select().from(schema.competitions).where(eq(schema.competitions.id, body.competitionId)).get()
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
  if (memberEmails.includes(body.email) || new Set(memberEmails).size !== memberEmails.length) {
    throw createError({ statusCode: 400, statusMessage: 'Each team member needs a different email address.' })
  }

  const duplicate = db
    .select({ id: schema.registrations.id })
    .from(schema.registrations)
    .where(and(eq(schema.registrations.competitionId, comp.id), eq(schema.registrations.email, body.email)))
    .get()
  if (duplicate) {
    throw createError({ statusCode: 409, statusMessage: 'This email is already registered for this competition.' })
  }

  const [registration] = await db
    .insert(schema.registrations)
    .values({
      competitionId: comp.id,
      fullName: body.fullName,
      email: body.email,
      phone: body.phone,
      institution: body.institution,
      teamName: comp.teamBased ? (body.teamName ?? null) : null,
      teamMembers: teamMembers.length ? teamMembers : null,
      notes: body.notes ?? null,
    })
    .returning()

  // ---- Provision participant accounts (leader active, members invited) ----

  const findAccount = (email: string) =>
    db.select().from(schema.participantAccounts).where(eq(schema.participantAccounts.email, email)).get()

  // Leader: create active account with the chosen password; if the email
  // already has an account (from another competition), keep its password.
  let leader = findAccount(body.email)
  if (!leader) {
    const passwordHash = await bcrypt.hash(body.password, 12)
    ;[leader] = await db
      .insert(schema.participantAccounts)
      .values({
        email: body.email,
        passwordHash,
        fullName: body.fullName,
        phone: body.phone,
        status: 'active',
        checkinToken: randomBytes(24).toString('hex'),
      })
      .returning()
  }
  await db
    .insert(schema.teamMembers)
    .values({ registrationId: registration!.id, accountId: leader!.id, role: 'leader' })
    .onConflictDoNothing()

  const invites: { account: typeof leader; name: string }[] = []
  for (const m of teamMembers) {
    let account = findAccount(m.email.toLowerCase())
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
      .values({ registrationId: registration!.id, accountId: account!.id, role: 'member' })
      .onConflictDoNothing()
    invites.push({ account, name: m.name })
  }

  // ---- Emails (console transport in dev; Resend when key is set). Failures
  // are logged inside sendMail and never break the registration. ----
  const teamName = registration!.teamName ?? ''
  sendMail({
    to: leader!.email,
    ...leaderConfirmationEmail({
      name: leader!.fullName,
      teamName,
      competition: comp.name,
      qrDataUrl: await qrDataUrl(leader!.checkinToken),
    }),
  }).catch(() => {})

  for (const { account, name } of invites) {
    if (!account) continue
    const mail = account.inviteToken
      ? inviteEmail({
          name,
          teamName,
          competition: comp.name,
          inviteToken: account.inviteToken,
          qrDataUrl: await qrDataUrl(account.checkinToken),
        })
      : leaderConfirmationEmail({
          // Existing active account added to a new team: no invite link needed.
          name,
          teamName,
          competition: comp.name,
          qrDataUrl: await qrDataUrl(account.checkinToken),
        })
    sendMail({ to: account.email, ...mail }).catch(() => {})
  }

  // Confirmation only — no stored data echoed back.
  return { ok: true }
})
