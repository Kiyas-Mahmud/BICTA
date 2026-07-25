import { getCompetitionBySlug } from '../../../utils/queries'

export default defineEventHandler(async (event) => {
  const slug = String(getRouterParam(event, 'slug') ?? '')
  const comp = await getCompetitionBySlug(slug)
  if (!comp) throw createError({ statusCode: 404, statusMessage: 'Competition not found' })
  return comp
})
