import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { useDb, schema } from '../../../database/client'

const gallerySchema = z.object({
  eventId: z.number().int().positive(),
  url: z.string().max(500).regex(/^\/uploads\//, 'Must be an uploaded image'),
  caption: z.string().trim().max(300).nullable().optional(),
  sortOrder: z.number().int().min(0).max(1000).default(0),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readValidatedBody(event, gallerySchema.parse)
  const db = useDb()

  const parent = db.select({ id: schema.events.id }).from(schema.events).where(eq(schema.events.id, body.eventId)).get()
  if (!parent) throw createError({ statusCode: 400, statusMessage: 'Event does not exist' })

  const [row] = await db
    .insert(schema.galleryImages)
    .values({ eventId: body.eventId, url: body.url, caption: body.caption ?? null, sortOrder: body.sortOrder })
    .returning()

  return row
})
