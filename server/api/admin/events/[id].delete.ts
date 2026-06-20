import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../../database/client'
import { idParam } from '../../../utils/validation'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = idParam.parse(getRouterParam(event, 'id'))
  const db = useDb()

  // Cascades to competitions, prizes, registrations, gallery via FK rules.
  await db.delete(schema.events).where(eq(schema.events.id, id))
  return { ok: true }
})
