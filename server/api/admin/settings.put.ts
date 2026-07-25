import { useDb, schema } from '../../database/client'
import { settingsSchema } from '../../utils/validation'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readValidatedBody(event, settingsSchema.parse)
  const db = useDb()

  // One batch = one D1 transaction: settings apply all-or-nothing.
  const statements = Object.entries(body).map(([key, value]) =>
    db
      .insert(schema.siteSettings)
      .values({ key, value })
      .onConflictDoUpdate({ target: schema.siteSettings.key, set: { value } }),
  )

  if (statements.length > 0) {
    await db.batch(statements as [(typeof statements)[number], ...(typeof statements)[number][]])
  }

  return { ok: true }
})
