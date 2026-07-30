import { asc, eq } from 'drizzle-orm'
import { useDb, schema } from '../../../database/client'

// Prize pool rows carry their event title so the admin list can group them.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
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
    .orderBy(asc(schema.eventPrizes.sortOrder))
})
