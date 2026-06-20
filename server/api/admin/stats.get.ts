import { count, eq } from 'drizzle-orm'
import { useDb, schema } from '../../database/client'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const db = useDb()
  const [eventsCount] = await db.select({ n: count() }).from(schema.events)
  const [competitionsCount] = await db.select({ n: count() }).from(schema.competitions)
  const [newsCount] = await db.select({ n: count() }).from(schema.news)
  const [registrationsCount] = await db.select({ n: count() }).from(schema.registrations)
  const currentEvent = db
    .select({ id: schema.events.id, title: schema.events.title, year: schema.events.year })
    .from(schema.events)
    .where(eq(schema.events.isCurrent, true))
    .get()

  return {
    events: eventsCount?.n ?? 0,
    competitions: competitionsCount?.n ?? 0,
    news: newsCount?.n ?? 0,
    registrations: registrationsCount?.n ?? 0,
    currentEvent: currentEvent ?? null,
  }
})
