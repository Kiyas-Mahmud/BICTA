import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../../database/client'
import { timelineSchema } from '../../../utils/validation'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readValidatedBody(event, timelineSchema.parse)
  const db = useDb()

  const current = db.select({ id: schema.events.id }).from(schema.events).where(eq(schema.events.isCurrent, true)).get()
  if (!current) throw createError({ statusCode: 400, statusMessage: 'Set a current event first' })

  const [row] = await db
    .insert(schema.timelineMilestones)
    .values({ eventId: current.id, label: body.label, date: body.date ?? null, note: body.note ?? null, sortOrder: body.sortOrder })
    .returning()
  return row
})
