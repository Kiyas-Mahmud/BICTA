import { eq, and, ne } from 'drizzle-orm'
import { useDb, schema } from '../../../database/client'
import { newsSchema, idParam } from '../../../utils/validation'
import { slugify, uniqueSlug } from '../../../utils/slug'
import { sanitizeRichText } from '../../../utils/sanitize'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = idParam.parse(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, newsSchema.parse)
  const db = useDb()

  const existing = db.select().from(schema.news).where(eq(schema.news.id, id)).get()
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Article not found' })

  const base = slugify(body.slug || body.title)
  const slug = uniqueSlug(
    base,
    (s) => !!db.select({ id: schema.news.id }).from(schema.news).where(and(eq(schema.news.slug, s), ne(schema.news.id, id))).get(),
  )

  // First transition to published stamps publishedAt; unpublishing keeps it.
  const publishedAt =
    body.status === 'published' ? (existing.publishedAt ?? new Date().toISOString()) : existing.publishedAt

  const [row] = await db
    .update(schema.news)
    .set({
      title: body.title,
      slug,
      excerpt: body.excerpt,
      content: sanitizeRichText(body.content),
      coverImage: body.coverImage || null,
      status: body.status,
      publishedAt,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.news.id, id))
    .returning()

  return row
})
