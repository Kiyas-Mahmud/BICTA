import { desc } from 'drizzle-orm'
import { useDb, schema } from '../../../database/client'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return useDb().select().from(schema.newsletterSubscribers).orderBy(desc(schema.newsletterSubscribers.createdAt))
})
