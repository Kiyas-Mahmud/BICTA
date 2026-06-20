import { useDb, schema } from '../../database/client'
import { settingsSchema } from '../../utils/validation'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readValidatedBody(event, settingsSchema.parse)
  const db = useDb()

  db.transaction((tx) => {
    for (const [key, value] of Object.entries(body)) {
      tx.insert(schema.siteSettings)
        .values({ key, value })
        .onConflictDoUpdate({ target: schema.siteSettings.key, set: { value } })
        .run()
    }
  })

  return { ok: true }
})
