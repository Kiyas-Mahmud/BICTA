import { eq, asc } from 'drizzle-orm'
import { useDb, schema } from '../../../database/client'

// Checkpoints for the current event (they reset per edition, like timeline).
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const db = useDb()
  const current = db.select({ id: schema.events.id }).from(schema.events).where(eq(schema.events.isCurrent, true)).get()
  if (!current) return []
  return db
    .select()
    .from(schema.checkpoints)
    .where(eq(schema.checkpoints.eventId, current.id))
    .orderBy(asc(schema.checkpoints.sortOrder))
})
