import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../../database/client'
import { newsSchema } from '../../../utils/validation'
import { slugify, uniqueSlug } from '../../../utils/slug'
import { sanitizeRichText } from '../../../utils/sanitize'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readValidatedBody(event, newsSchema.parse)
  const db = useDb()

  const base = slugify(body.slug || body.title)
  const slug = uniqueSlug(base, (s) => !!db.select({ id: schema.news.id }).from(schema.news).where(eq(schema.news.slug, s)).get())

  const [row] = await db
    .insert(schema.news)
    .values({
      title: body.title,
      slug,
      excerpt: body.excerpt,
      content: sanitizeRichText(body.content),
      coverImage: body.coverImage || null,
      status: body.status,
      publishedAt: body.status === 'published' ? new Date().toISOString() : null,
    })
    .returning()

  return row
})
