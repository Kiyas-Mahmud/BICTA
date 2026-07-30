import { z } from 'zod'
import { desc, eq } from 'drizzle-orm'
import { useDb, schema } from '../../../database/client'

const eventQuery = z.object({ eventId: z.coerce.number().int().positive().optional() })

// Notice-board order: pinned first, then newest. Carries the event title so the
// admin list can group without a second round trip.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  // Scoped to one event when the caller asks; the standalone screens omit it.
  const { eventId } = await getValidatedQuery(event, eventQuery.parse)
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
    .where(eventId ? eq(schema.announcements.eventId, eventId) : undefined)
    .orderBy(desc(schema.announcements.pinned), desc(schema.announcements.createdAt))
})
