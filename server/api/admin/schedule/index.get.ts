import { asc, eq } from 'drizzle-orm'
import { useDb, schema } from '../../../database/client'

// Sorted the way the public page renders it: by date, then start time.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return useDb()
    .select({
      id: schema.scheduleItems.id,
      eventId: schema.scheduleItems.eventId,
      competitionId: schema.scheduleItems.competitionId,
      date: schema.scheduleItems.date,
      startTime: schema.scheduleItems.startTime,
      endTime: schema.scheduleItems.endTime,
      title: schema.scheduleItems.title,
      sessionType: schema.scheduleItems.sessionType,
      venue: schema.scheduleItems.venue,
      speaker: schema.scheduleItems.speaker,
      description: schema.scheduleItems.description,
      published: schema.scheduleItems.published,
      sortOrder: schema.scheduleItems.sortOrder,
      eventTitle: schema.events.title,
    })
    .from(schema.scheduleItems)
    .innerJoin(schema.events, eq(schema.events.id, schema.scheduleItems.eventId))
    .orderBy(asc(schema.scheduleItems.date), asc(schema.scheduleItems.startTime), asc(schema.scheduleItems.sortOrder))
})
