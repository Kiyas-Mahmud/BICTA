import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../../database/client'
import { eventSchema } from '../../../utils/validation'
import { slugify, uniqueSlug } from '../../../utils/slug'
import { sanitizeRichText } from '../../../utils/sanitize'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readValidatedBody(event, eventSchema.parse)
  const db = useDb()

  const base = slugify(body.slug || body.title)
  const slug = uniqueSlug(base, (s) => !!db.select({ id: schema.events.id }).from(schema.events).where(eq(schema.events.slug, s)).get())

  const [row] = await db
    .insert(schema.events)
    .values({
      title: body.title,
      year: body.year,
      slug,
      description: sanitizeRichText(body.description),
      startDate: body.startDate ?? null,
      endDate: body.endDate ?? null,
      venue: body.venue ?? null,
      heroImage: body.heroImage || null,
      status: body.status,
    })
    .returning()

  return row
})
