import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../../database/client'
import { timelineSchema } from '../../../utils/validation'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readValidatedBody(event, timelineSchema.parse)
  const db = useDb()

  // The event is chosen explicitly now. Falling back to the current edition
  // keeps older callers working, and is the sensible default when only one
  // event is in play.
  let eventId = body.eventId
  if (!eventId) {
    const current = await db.select({ id: schema.events.id }).from(schema.events).where(eq(schema.events.isCurrent, true)).get()
    if (!current) throw createError({ statusCode: 400, statusMessage: 'Pick an event for this milestone' })
    eventId = current.id
  }

  const [row] = await db
    .insert(schema.timelineMilestones)
    .values({ eventId, label: body.label, date: body.date ?? null, note: body.note ?? null, sortOrder: body.sortOrder })
    .returning()
  return row
})
