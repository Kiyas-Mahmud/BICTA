import { z } from 'zod'
import { asc, eq } from 'drizzle-orm'
import { useDb, schema } from '../../../database/client'

const eventQuery = z.object({ eventId: z.coerce.number().int().positive().optional() })

// Milestones belong to one edition. Without an explicit event the caller gets
// every milestone with its event title, so the standalone screen can group and
// filter; the event workspace passes its own id.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { eventId } = await getValidatedQuery(event, eventQuery.parse)

  return useDb()
    .select({
      id: schema.timelineMilestones.id,
      eventId: schema.timelineMilestones.eventId,
      label: schema.timelineMilestones.label,
      date: schema.timelineMilestones.date,
      note: schema.timelineMilestones.note,
      sortOrder: schema.timelineMilestones.sortOrder,
      eventTitle: schema.events.title,
    })
    .from(schema.timelineMilestones)
    .innerJoin(schema.events, eq(schema.events.id, schema.timelineMilestones.eventId))
    .where(eventId ? eq(schema.timelineMilestones.eventId, eventId) : undefined)
    .orderBy(asc(schema.timelineMilestones.sortOrder))
})
