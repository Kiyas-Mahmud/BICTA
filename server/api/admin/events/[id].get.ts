import { eq, asc } from 'drizzle-orm'
import { useDb, schema } from '../../../database/client'
import { idParam } from '../../../utils/validation'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = idParam.parse(getRouterParam(event, 'id'))
  const db = useDb()

  const row = db.select().from(schema.events).where(eq(schema.events.id, id)).get()
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Event not found' })

  const competitions = await db
    .select()
    .from(schema.competitions)
    .where(eq(schema.competitions.eventId, id))
    .orderBy(asc(schema.competitions.sortOrder))

  const gallery = await db
    .select()
    .from(schema.galleryImages)
    .where(eq(schema.galleryImages.eventId, id))
    .orderBy(asc(schema.galleryImages.sortOrder))

  return { ...row, competitions, gallery }
})
