import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../../database/client'
import { idParam } from '../../../utils/validation'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = idParam.parse(getRouterParam(event, 'id'))
  await useDb().delete(schema.galleryImages).where(eq(schema.galleryImages.id, id))
  return { ok: true }
})
