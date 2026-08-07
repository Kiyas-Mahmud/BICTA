import { randomBytes } from 'node:crypto'
import { eq, and, count } from 'drizzle-orm'
import { useDb, schema } from '../../../../../database/client'
import { teamMemberAddSchema, idParam } from '../../../../../utils/validation'
import { syncLegacyRoster } from '../../../../../utils/team'
import { sendMail, inviteEmail, leaderConfirmationEmail } from '../../../../../utils/email'
import { INVITE_TTL_MS } from '../../../../../utils/invites'

// Admin override of the leader's own "add teammate" — same rules (team size,
// one team per competition) but never blocked by the registration deadline.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const registrationId = idParam.parse(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, teamMemberAddSchema.parse)
  const db = useDb()

  const registration = await db.select().from(schema.registrations).where(eq(schema.registrations.id, registrationId)).get()
  if (!registration) throw createError({ statusCode: 404, statusMessage: 'Registration not found' })
  const comp = await db.select().from(schema.competitions).where(eq(schema.competitions.id, registration.competitionId)).get()
  if (!comp) throw createError({ statusCode: 404, statusMessage: 'Competition not found' })

  const [{ n: rosterSize }] = await db
    .select({ n: count() })
    .from(schema.teamMembers)
    .where(eq(schema.teamMembers.registrationId, registrationId))
  if (rosterSize >= comp.maxTeamSize) {
    throw createError({ statusCode: 400, statusMessage: `Teams may have at most ${comp.maxTeamSize} members including the leader.` })
  }

  let account = await db.select().from(schema.participantAccounts).where(eq(schema.participantAccounts.email, body.email)).get()
  if (!account) {
    ;[account] = await db
      .insert(schema.participantAccounts)
      .values({
        email: body.email,
        fullName: body.name,
        status: 'invited',
        inviteToken: randomBytes(32).toString('hex'),
        inviteExpires: new Date(Date.now() + INVITE_TTL_MS).toISOString(),
        checkinToken: randomBytes(24).toString('hex'),
      })
      .returning()
  }

  const elsewhere = await db
    .select({ registrationId: schema.teamMembers.registrationId })
    .from(schema.teamMembers)
    .where(and(eq(schema.teamMembers.competitionId, comp.id), eq(schema.teamMembers.accountId, account!.id)))
    .get()
  if (elsewhere) {
    throw createError({
      statusCode: 409,
      statusMessage:
        elsewhere.registrationId === registrationId
          ? 'This person is already on the team.'
          : `${body.name} is already on another team for ${comp.name}. Each person can join one team per competition.`,
    })
  }

  const inserted = await db
    .insert(schema.teamMembers)
    .values({ registrationId, competitionId: comp.id, accountId: account!.id, role: 'member', checkinToken: randomBytes(24).toString('hex') })
    .onConflictDoNothing()
    .returning()
  if (!inserted.length) {
    throw createError({ statusCode: 409, statusMessage: 'This person is already on the team.' })
  }

  await syncLegacyRoster(registrationId)

  const mail = account!.inviteToken
    ? await inviteEmail({ name: body.name, teamName: registration.teamName ?? '', competition: comp.name, inviteToken: account!.inviteToken, checkinToken: account!.checkinToken })
    : await leaderConfirmationEmail({ name: body.name, teamName: registration.teamName ?? '', competition: comp.name, checkinToken: account!.checkinToken })
  await sendMail({ to: account!.email, ...mail }).catch(() => {})

  return { ok: true }
})
