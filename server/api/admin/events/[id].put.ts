import { eq, and, ne } from 'drizzle-orm'
import { useDb, schema } from '../../../database/client'
import { eventSchema, idParam } from '../../../utils/validation'
import { slugify, uniqueSlug } from '../../../utils/slug'
import { sanitizeRichText } from '../../../utils/sanitize'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = idParam.parse(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, eventSchema.parse)
  const db = useDb()

  const existing = db.select({ id: schema.events.id }).from(schema.events).where(eq(schema.events.id, id)).get()
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Event not found' })

  const base = slugify(body.slug || body.title)
  const slug = uniqueSlug(base, (s) =>
    !!db.select({ id: schema.events.id }).from(schema.events).where(and(eq(schema.events.slug, s), ne(schema.events.id, id))).get(),
  )

  const [row] = await db
    .update(schema.events)
    .set({
      title: body.title,
      year: body.year,
      slug,
      description: sanitizeRichText(body.description),
      startDate: body.startDate ?? null,
      endDate: body.endDate ?? null,
      venue: body.venue ?? null,
      heroImage: body.heroImage || null,
      status: body.status,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.events.id, id))
    .returning()

  return row
})
