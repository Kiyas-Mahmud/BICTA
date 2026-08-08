import { desc } from 'drizzle-orm'
import { useDb, schema } from '../../../database/client'

export default defineEventHandler(async (event) => {
  await requireMainAdmin(event)
  return useDb().select().from(schema.mailCampaigns).orderBy(desc(schema.mailCampaigns.createdAt)).limit(50)
})
