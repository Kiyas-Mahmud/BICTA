import { z } from 'zod'
import { asc, eq, or, isNull } from 'drizzle-orm'
import { useDb, schema } from '../../../database/client'

const eventQuery = z.object({ eventId: z.coerce.number().int().positive().optional() })

// Filtering by event includes the house partners (null event), because those
// appear on that event's page too — hiding them would misrepresent the lineup.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { eventId } = await getValidatedQuery(event, eventQuery.parse)

  return useDb()
    .select()
    .from(schema.sponsors)
    .where(eventId ? or(isNull(schema.sponsors.eventId), eq(schema.sponsors.eventId, eventId)) : undefined)
    .orderBy(asc(schema.sponsors.sortOrder))
})
