import { z } from 'zod'
import { asc, eq } from 'drizzle-orm'
import { useDb, schema } from '../../../database/client'

const eventQuery = z.object({ eventId: z.coerce.number().int().positive().optional() })

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  // Scoped to one event when the caller asks; the standalone screens omit it.
  const { eventId } = await getValidatedQuery(event, eventQuery.parse)
  return useDb()
    .select({
      id: schema.judgingCriteria.id,
      eventId: schema.judgingCriteria.eventId,
      competitionId: schema.judgingCriteria.competitionId,
      name: schema.judgingCriteria.name,
      description: schema.judgingCriteria.description,
      weight: schema.judgingCriteria.weight,
      icon: schema.judgingCriteria.icon,
      published: schema.judgingCriteria.published,
      sortOrder: schema.judgingCriteria.sortOrder,
      eventTitle: schema.events.title,
    })
    .from(schema.judgingCriteria)
    .innerJoin(schema.events, eq(schema.events.id, schema.judgingCriteria.eventId))
    .where(eventId ? eq(schema.judgingCriteria.eventId, eventId) : undefined)
    .orderBy(asc(schema.judgingCriteria.sortOrder))
})
