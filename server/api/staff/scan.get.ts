import { and, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { useDb, schema } from '../../database/client'
import { allowedCompetitionIds } from '../../utils/volunteerScope'

const querySchema = z.object({ token: z.string().trim().min(10).max(200) })

// Resolve a scanned QR token to a person + their team(s) + collection state.
// A scoped volunteer may only resolve participants from their own
// competitions, and only sees those memberships.
export default defineEventHandler(async (event) => {
  const staff = await requireStaff(event)
  const q = await getValidatedQuery(event, querySchema.parse)
  const db = useDb()

  const account = await db
    .select()
    .from(schema.participantAccounts)
    .where(eq(schema.participantAccounts.checkinToken, q.token))
    .get()
  if (!account) throw createError({ statusCode: 404, statusMessage: 'Unknown QR code' })

  const allowed = await allowedCompetitionIds(event, staff)

  const memberships = await db
    .select({
      competitionId: schema.teamMembers.competitionId,
      role: schema.teamMembers.role,
      teamName: schema.registrations.teamName,
      regStatus: schema.registrations.status,
      competition: schema.competitions.name,
    })
    .from(schema.teamMembers)
    .innerJoin(schema.registrations, eq(schema.registrations.id, schema.teamMembers.registrationId))
    .innerJoin(schema.competitions, eq(schema.competitions.id, schema.registrations.competitionId))
    .where(
      and(
        eq(schema.teamMembers.accountId, account.id),
        allowed ? inArray(schema.teamMembers.competitionId, allowed) : undefined,
      ),
    )

  // Someone with no membership inside this volunteer's scope is not theirs to
  // check in — say so plainly rather than showing an empty card.
  if (allowed && !memberships.length) {
    throw createError({
      statusCode: 403,
      statusMessage: 'This participant is not in a competition you are assigned to.',
    })
  }

  const collected = await db
    .select({ checkpointId: schema.checkins.checkpointId, collectedAt: schema.checkins.collectedAt })
    .from(schema.checkins)
    .where(eq(schema.checkins.accountId, account.id))

  return {
    account: { id: account.id, fullName: account.fullName, email: account.email },
    memberships,
    collected,
  }
})
