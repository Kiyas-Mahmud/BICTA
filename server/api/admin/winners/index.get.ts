import { z } from 'zod'
import { asc, eq } from 'drizzle-orm'
import { useDb, schema } from '../../../database/client'

const eventQuery = z.object({ eventId: z.coerce.number().int().positive().optional() })

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { eventId } = await getValidatedQuery(event, eventQuery.parse)

  return useDb()
    .select()
    .from(schema.winners)
    .where(eventId ? eq(schema.winners.eventId, eventId) : undefined)
    .orderBy(asc(schema.winners.sortOrder))
})
