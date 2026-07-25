import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../../../database/client'
import { idParam } from '../../../../utils/validation'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = idParam.parse(getRouterParam(event, 'id'))
  const db = useDb()

  const existing = await db.select({ id: schema.events.id }).from(schema.events).where(eq(schema.events.id, id)).get()
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Event not found' })

  // A D1 batch runs as a single transaction, so exactly one event ends up
  // current even if the request dies between the two statements.
  await db.batch([
    db.update(schema.events).set({ isCurrent: false }),
    db.update(schema.events).set({ isCurrent: true }).where(eq(schema.events.id, id)),
  ])

  return { ok: true }
})
