import { getPublishedNewsBySlug } from '../../../utils/queries'

export default defineEventHandler(async (event) => {
  const slug = String(getRouterParam(event, 'slug') ?? '')
  const article = await getPublishedNewsBySlug(slug)
  if (!article) throw createError({ statusCode: 404, statusMessage: 'Article not found' })
  return article
})
