import { z } from 'zod'
import { asc, eq, inArray } from 'drizzle-orm'
import { useDb, schema } from '../../../database/client'

const eventQuery = z.object({ eventId: z.coerce.number().int().positive().optional() })

// People are reusable across editions, so "belongs to an event" means assigned
// to judge one of that event's competitions.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { eventId } = await getValidatedQuery(event, eventQuery.parse)
  const db = useDb()

  if (!eventId) return db.select().from(schema.people).orderBy(asc(schema.people.sortOrder))

  const assigned = await db
    .select({ personId: schema.judgeAssignments.personId })
    .from(schema.judgeAssignments)
    .innerJoin(schema.competitions, eq(schema.competitions.id, schema.judgeAssignments.competitionId))
    .where(eq(schema.competitions.eventId, eventId))

  const ids = [...new Set(assigned.map((a) => a.personId))]
  if (!ids.length) return []

  return db.select().from(schema.people).where(inArray(schema.people.id, ids)).orderBy(asc(schema.people.sortOrder))
})
