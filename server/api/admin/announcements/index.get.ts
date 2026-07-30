import { desc, eq } from 'drizzle-orm'
import { useDb, schema } from '../../../database/client'

// Notice-board order: pinned first, then newest. Carries the event title so the
// admin list can group without a second round trip.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return useDb()
    .select({
      id: schema.announcements.id,
      eventId: schema.announcements.eventId,
      title: schema.announcements.title,
      body: schema.announcements.body,
      pinned: schema.announcements.pinned,
      published: schema.announcements.published,
      createdAt: schema.announcements.createdAt,
      eventTitle: schema.events.title,
    })
    .from(schema.announcements)
    .innerJoin(schema.events, eq(schema.events.id, schema.announcements.eventId))
    .orderBy(desc(schema.announcements.pinned), desc(schema.announcements.createdAt))
})
