import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../../../database/client'
import { idParam } from '../../../../utils/validation'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = idParam.parse(getRouterParam(event, 'id'))
  const db = useDb()

  const existing = db.select({ id: schema.events.id }).from(schema.events).where(eq(schema.events.id, id)).get()
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Event not found' })

  // Single transaction guarantees exactly one current event.
  db.transaction((tx) => {
    tx.update(schema.events).set({ isCurrent: false }).run()
    tx.update(schema.events).set({ isCurrent: true }).where(eq(schema.events.id, id)).run()
  })

  return { ok: true }
})
