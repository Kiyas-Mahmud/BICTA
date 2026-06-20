import { desc, eq, count } from 'drizzle-orm'
import { useDb, schema } from '../../../database/client'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const db = useDb()

  const rows = await db
    .select({
      id: schema.events.id,
      title: schema.events.title,
      year: schema.events.year,
      slug: schema.events.slug,
      status: schema.events.status,
      isCurrent: schema.events.isCurrent,
      startDate: schema.events.startDate,
      endDate: schema.events.endDate,
      competitionCount: count(schema.competitions.id),
    })
    .from(schema.events)
    .leftJoin(schema.competitions, eq(schema.competitions.eventId, schema.events.id))
    .groupBy(schema.events.id)
    .orderBy(desc(schema.events.year))

  return rows
})
