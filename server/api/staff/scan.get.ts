import { eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { useDb, schema } from '../../database/client'

const querySchema = z.object({ token: z.string().trim().min(10).max(200) })

// Resolve a scanned QR token to a person + their team(s) + collection state.
export default defineEventHandler(async (event) => {
  await requireStaff(event)
  const q = await getValidatedQuery(event, querySchema.parse)
  const db = useDb()

  const account = db
    .select()
    .from(schema.participantAccounts)
    .where(eq(schema.participantAccounts.checkinToken, q.token))
    .get()
  if (!account) throw createError({ statusCode: 404, statusMessage: 'Unknown QR code' })

  const memberships = await db
    .select({
      role: schema.teamMembers.role,
      teamName: schema.registrations.teamName,
      regStatus: schema.registrations.status,
      competition: schema.competitions.name,
    })
    .from(schema.teamMembers)
    .innerJoin(schema.registrations, eq(schema.registrations.id, schema.teamMembers.registrationId))
    .innerJoin(schema.competitions, eq(schema.competitions.id, schema.registrations.competitionId))
    .where(eq(schema.teamMembers.accountId, account.id))

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
