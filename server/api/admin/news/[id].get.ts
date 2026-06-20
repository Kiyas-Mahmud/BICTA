import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../../database/client'
import { idParam } from '../../../utils/validation'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = idParam.parse(getRouterParam(event, 'id'))
  const row = useDb().select().from(schema.news).where(eq(schema.news.id, id)).get()
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Article not found' })
  return row
})
