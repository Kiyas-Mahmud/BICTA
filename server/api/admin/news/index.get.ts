import { desc } from 'drizzle-orm'
import { useDb, schema } from '../../../database/client'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const db = useDb()
  return db.select().from(schema.news).orderBy(desc(schema.news.createdAt))
})
