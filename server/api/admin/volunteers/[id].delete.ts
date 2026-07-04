import { eq, and } from 'drizzle-orm'
import { useDb, schema } from '../../../database/client'
import { idParam } from '../../../utils/validation'

// Deletes VOLUNTEER accounts only — real admins can never be removed here.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = idParam.parse(getRouterParam(event, 'id'))
  await useDb()
    .delete(schema.admins)
    .where(and(eq(schema.admins.id, id), eq(schema.admins.role, 'volunteer')))
  return { ok: true }
})
