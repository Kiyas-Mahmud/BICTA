import { asc, eq } from 'drizzle-orm'
import { useDb, schema } from '../../../database/client'

// Milestones for the current event (timeline resets each edition).
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const db = useDb()
  const current = db.select({ id: schema.events.id }).from(schema.events).where(eq(schema.events.isCurrent, true)).get()
  if (!current) return []
  return db
    .select()
    .from(schema.timelineMilestones)
    .where(eq(schema.timelineMilestones.eventId, current.id))
    .orderBy(asc(schema.timelineMilestones.sortOrder))
})
