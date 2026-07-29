import { asc, desc, eq } from 'drizzle-orm'
import { useDb, schema } from '../../database/client'

// Events with their competitions nested — one round trip for every cascading
// Event -> Competition picker in the console (registrations, collection
// report, check-in points, volunteer assignment).
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const db = useDb()

  const events = await db
    .select({
      id: schema.events.id,
      title: schema.events.title,
      year: schema.events.year,
      status: schema.events.status,
      isCurrent: schema.events.isCurrent,
    })
    .from(schema.events)
    .orderBy(desc(schema.events.year))

  const competitions = await db
    .select({
      id: schema.competitions.id,
      eventId: schema.competitions.eventId,
      name: schema.competitions.name,
      type: schema.competitions.type,
    })
    .from(schema.competitions)
    .orderBy(asc(schema.competitions.sortOrder))

  return events.map((e) => ({
    ...e,
    competitions: competitions.filter((c) => c.eventId === e.id),
  }))
})
