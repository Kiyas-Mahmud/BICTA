import { eq, and, asc } from 'drizzle-orm'
import { useDb, schema } from '../../database/client'

// Checkpoints the scanner can mark right now (current event, active only).
export default defineEventHandler(async (event) => {
  await requireStaff(event)
  const db = useDb()
  const current = db.select({ id: schema.events.id }).from(schema.events).where(eq(schema.events.isCurrent, true)).get()
  if (!current) return []
  return db
    .select()
    .from(schema.checkpoints)
    .where(and(eq(schema.checkpoints.eventId, current.id), eq(schema.checkpoints.active, true)))
    .orderBy(asc(schema.checkpoints.sortOrder))
})
