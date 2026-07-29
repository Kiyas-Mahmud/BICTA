import { and, asc, desc, eq, gte, lte, like, or, type SQL } from 'drizzle-orm'
import { z } from 'zod'
import { useDb, schema } from '../../../database/client'

// Collection report: who picked up what, where, and from whom.
//
// "Collection" here means physical items (welcome kit, lunch, snacks) handed
// out at a check-in point. This system has no payments, so there is no amount
// or payment status to report on.
export const collectionQuerySchema = z.object({
  eventId: z.coerce.number().int().positive().optional(),
  competitionId: z.coerce.number().int().positive().optional(),
  checkpointId: z.coerce.number().int().positive().optional(),
  volunteerId: z.coerce.number().int().positive().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  search: z.string().trim().max(200).optional(),
})

/** Shared by the report and its CSV export so both always agree. */
export function collectionRows(q: z.infer<typeof collectionQuerySchema>) {
  const db = useDb()

  const filters: SQL[] = []
  if (q.eventId) filters.push(eq(schema.checkpoints.eventId, q.eventId))
  if (q.competitionId) filters.push(eq(schema.checkins.competitionId, q.competitionId))
  if (q.checkpointId) filters.push(eq(schema.checkins.checkpointId, q.checkpointId))
  if (q.volunteerId) filters.push(eq(schema.checkins.scannedBy, q.volunteerId))
  if (q.from) filters.push(gte(schema.checkins.collectedAt, `${q.from} 00:00:00`))
  if (q.to) filters.push(lte(schema.checkins.collectedAt, `${q.to} 23:59:59`))
  if (q.search) {
    const needle = `%${q.search.toLowerCase()}%`
    filters.push(
      or(
        like(schema.participantAccounts.fullName, needle),
        like(schema.participantAccounts.email, needle),
        like(schema.checkpoints.name, needle),
      )!,
    )
  }

  return db
    .select({
      id: schema.checkins.id,
      participant: schema.participantAccounts.fullName,
      email: schema.participantAccounts.email,
      checkpoint: schema.checkpoints.name,
      checkpointLocation: schema.checkpoints.location,
      competition: schema.competitions.name,
      event: schema.events.title,
      collectedAt: schema.checkins.collectedAt,
      collectedBy: schema.admins.name,
    })
    .from(schema.checkins)
    .innerJoin(schema.participantAccounts, eq(schema.participantAccounts.id, schema.checkins.accountId))
    .innerJoin(schema.checkpoints, eq(schema.checkpoints.id, schema.checkins.checkpointId))
    .innerJoin(schema.events, eq(schema.events.id, schema.checkpoints.eventId))
    .leftJoin(schema.competitions, eq(schema.competitions.id, schema.checkins.competitionId))
    .leftJoin(schema.admins, eq(schema.admins.id, schema.checkins.scannedBy))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(schema.checkins.collectedAt))
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const q = await getValidatedQuery(event, collectionQuerySchema.parse)
  const db = useDb()

  const rows = await collectionRows(q)

  // Filter options for the toolbar.
  const currentEvent = await db.select().from(schema.events).where(eq(schema.events.isCurrent, true)).get()
  const scopeEventId = q.eventId ?? currentEvent?.id

  const checkpoints = scopeEventId
    ? await db
        .select({
          id: schema.checkpoints.id,
          name: schema.checkpoints.name,
          location: schema.checkpoints.location,
          competitionId: schema.checkpoints.competitionId,
          active: schema.checkpoints.active,
        })
        .from(schema.checkpoints)
        .where(eq(schema.checkpoints.eventId, scopeEventId))
        .orderBy(asc(schema.checkpoints.sortOrder))
    : []

  const volunteers = await db
    .select({ id: schema.admins.id, name: schema.admins.name, role: schema.admins.role })
    .from(schema.admins)
    .orderBy(asc(schema.admins.name))

  // Totals, computed over the filtered set.
  const byCheckpoint: Record<string, number> = {}
  const byCompetition: Record<string, number> = {}
  const people = new Set<string>()
  for (const r of rows) {
    byCheckpoint[r.checkpoint] = (byCheckpoint[r.checkpoint] ?? 0) + 1
    byCompetition[r.competition ?? 'Event-wide'] = (byCompetition[r.competition ?? 'Event-wide'] ?? 0) + 1
    people.add(r.email)
  }

  return {
    rows,
    checkpoints,
    volunteers,
    totals: { collections: rows.length, participants: people.size, byCheckpoint, byCompetition },
  }
})
