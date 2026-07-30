import { z } from 'zod'
import { getEventDetail } from '../../../utils/queries'

const slugOrId = z.string().trim().min(1).max(120)

/**
 * Everything the event page renders: competitions with prizes, registered
 * team and participant counts, event prize pool, milestone timeline, day
 * schedule, judging criteria, judges, sponsors, gallery, announcements and
 * event-scoped FAQs. The parameter is a slug (canonical) or a legacy numeric
 * id; unpublished events 404.
 */
export default defineEventHandler(async (event) => {
  const key = slugOrId.parse(getRouterParam(event, 'id'))
  const detail = await getEventDetail(key)
  if (!detail) throw createError({ statusCode: 404, statusMessage: 'Event not found' })
  return detail
})
