import { getPublishedNewsBySlug } from '../../../utils/queries'

export default defineEventHandler((event) => {
  const slug = String(getRouterParam(event, 'slug') ?? '')
  const article = getPublishedNewsBySlug(slug)
  if (!article) throw createError({ statusCode: 404, statusMessage: 'Article not found' })
  return article
})
