import { asc, eq } from 'drizzle-orm'
import { useDb, schema } from '../../../database/client'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
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
    .orderBy(asc(schema.judgingCriteria.sortOrder))
})
