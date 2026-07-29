import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../../database/client'
import { checkpointSchema } from '../../../utils/validation'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readValidatedBody(event, checkpointSchema.parse)
  const db = useDb()

  const current = await db.select({ id: schema.events.id }).from(schema.events).where(eq(schema.events.isCurrent, true)).get()
  if (!current) throw createError({ statusCode: 400, statusMessage: 'Set a current event first' })

  // A competition-specific desk must belong to the current event, otherwise
  // the scanner could never reach it.
  if (body.competitionId) {
    const comp = await db.select().from(schema.competitions).where(eq(schema.competitions.id, body.competitionId)).get()
    if (!comp) throw createError({ statusCode: 400, statusMessage: 'Competition does not exist' })
    if (comp.eventId !== current.id) {
      throw createError({ statusCode: 400, statusMessage: 'Pick a competition from the current event.' })
    }
  }

  const [row] = await db
    .insert(schema.checkpoints)
    .values({
      eventId: current.id,
      competitionId: body.competitionId ?? null,
      name: body.name,
      location: body.location,
      description: body.description,
      icon: body.icon ?? null,
      qrEnabled: body.qrEnabled,
      active: body.active,
      sortOrder: body.sortOrder,
    })
    .returning()
  return row
})
