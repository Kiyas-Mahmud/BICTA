import { eq, asc } from 'drizzle-orm'
import { useDb, schema } from '../../../database/client'

// Collection report: every participant of the current event's teams with
// which checkpoints they've collected.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const db = useDb()

  const current = db.select({ id: schema.events.id }).from(schema.events).where(eq(schema.events.isCurrent, true)).get()
  if (!current) return { checkpoints: [], participants: [] }

  const checkpoints = await db
    .select()
    .from(schema.checkpoints)
    .where(eq(schema.checkpoints.eventId, current.id))
    .orderBy(asc(schema.checkpoints.sortOrder))

  // Participants = every team_members row whose registration belongs to a
  // competition of the current event.
  const rows = await db
    .select({
      accountId: schema.participantAccounts.id,
      fullName: schema.participantAccounts.fullName,
      email: schema.participantAccounts.email,
      accountStatus: schema.participantAccounts.status,
      role: schema.teamMembers.role,
      teamName: schema.registrations.teamName,
      competition: schema.competitions.name,
    })
    .from(schema.teamMembers)
    .innerJoin(schema.participantAccounts, eq(schema.participantAccounts.id, schema.teamMembers.accountId))
    .innerJoin(schema.registrations, eq(schema.registrations.id, schema.teamMembers.registrationId))
    .innerJoin(schema.competitions, eq(schema.competitions.id, schema.registrations.competitionId))
    .where(eq(schema.competitions.eventId, current.id))

  const allCheckins = await db.select().from(schema.checkins)
  const byAccount = new Map<number, number[]>()
  for (const ci of allCheckins) {
    const list = byAccount.get(ci.accountId) ?? []
    list.push(ci.checkpointId)
    byAccount.set(ci.accountId, list)
  }

  return {
    checkpoints,
    participants: rows.map((r) => ({
      ...r,
      collected: (byAccount.get(r.accountId) ?? []).filter((id) => checkpoints.some((c) => c.id === id)),
    })),
  }
})
