import { useDb, schema } from '../../database/client'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const rows = await useDb().select().from(schema.siteSettings)
  return Object.fromEntries(rows.map((r) => [r.key, r.value]))
})
