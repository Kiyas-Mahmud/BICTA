import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../../../database/client'
import { idParam } from '../../../../utils/validation'

// Live roster for one registration — the real team_members/participant_accounts
// rows, not the read-only teamMembers JSON snapshot shown in the list view.
// This is what the admin "Manage team" panel edits from.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const registrationId = idParam.parse(getRouterParam(event, 'id'))
  const db = useDb()

  const registration = await db.select().from(schema.registrations).where(eq(schema.registrations.id, registrationId)).get()
  if (!registration) throw createError({ statusCode: 404, statusMessage: 'Registration not found' })

  const comp = await db.select().from(schema.competitions).where(eq(schema.competitions.id, registration.competitionId)).get()

  const roster = await db
    .select({
      memberId: schema.teamMembers.id,
      accountId: schema.participantAccounts.id,
      role: schema.teamMembers.role,
      fullName: schema.participantAccounts.fullName,
      email: schema.participantAccounts.email,
      status: schema.participantAccounts.status,
    })
    .from(schema.teamMembers)
    .innerJoin(schema.participantAccounts, eq(schema.participantAccounts.id, schema.teamMembers.accountId))
    .where(eq(schema.teamMembers.registrationId, registrationId))

  const deadlinePassed = comp?.registrationDeadline
    ? new Date(`${comp.registrationDeadline}T23:59:59Z`) < new Date()
    : false

  return {
    registrationId,
    teamName: registration.teamName,
    maxTeamSize: comp?.maxTeamSize ?? 1,
    deadlinePassed,
    roster,
  }
})
