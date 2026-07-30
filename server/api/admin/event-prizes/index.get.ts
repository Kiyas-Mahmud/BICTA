import { z } from 'zod'
import { asc, eq } from 'drizzle-orm'
import { useDb, schema } from '../../../database/client'

const eventQuery = z.object({ eventId: z.coerce.number().int().positive().optional() })

// Prize pool rows carry their event title so the admin list can group them.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  // Scoped to one event when the caller asks; the standalone screens omit it.
  const { eventId } = await getValidatedQuery(event, eventQuery.parse)
  return useDb()
    .select({
      id: schema.eventPrizes.id,
      eventId: schema.eventPrizes.eventId,
      title: schema.eventPrizes.title,
      amount: schema.eventPrizes.amount,
      note: schema.eventPrizes.note,
      highlight: schema.eventPrizes.highlight,
      published: schema.eventPrizes.published,
      sortOrder: schema.eventPrizes.sortOrder,
      eventTitle: schema.events.title,
    })
    .from(schema.eventPrizes)
    .innerJoin(schema.events, eq(schema.events.id, schema.eventPrizes.eventId))
    .where(eventId ? eq(schema.eventPrizes.eventId, eventId) : undefined)
    .orderBy(asc(schema.eventPrizes.sortOrder))
})
