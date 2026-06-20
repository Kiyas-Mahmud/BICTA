import { getEventBySlug } from '../../../utils/queries'

export default defineEventHandler(async (event) => {
  const slug = String(getRouterParam(event, 'slug') ?? '')
  const ev = await getEventBySlug(slug)
  if (!ev) throw createError({ statusCode: 404, statusMessage: 'Event not found' })
  return ev
})
