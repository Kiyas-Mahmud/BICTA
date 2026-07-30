import { z } from 'zod'
import { getEventDetail } from '../../../utils/queries'

const slugOrId = z.string().trim().min(1).max(120)
const previewQuery = z.object({ preview: z.string().optional() })

/**
 * Everything the event page renders: competitions with prizes, registered
 * team and participant counts, event prize pool, milestone timeline, day
 * schedule, judging criteria, judges, sponsors, gallery, announcements and
 * event-scoped FAQs. The parameter is a slug (canonical) or a legacy numeric
 * id.
 *
 * Unpublished events 404 for the public. `?preview=1` lifts that, but only for
 * a signed-in admin — the flag alone grants nothing, so a guessed URL still
 * cannot reach a draft.
 */
export default defineEventHandler(async (event) => {
  const key = slugOrId.parse(getRouterParam(event, 'id'))
  const { preview } = await getValidatedQuery(event, previewQuery.parse)

  let includeDrafts = false
  if (preview) {
    const session = await getUserSession(event)
    includeDrafts = (session as any)?.user?.role === 'admin'
  }

  const detail = await getEventDetail(key, { includeDrafts })
  if (!detail) throw createError({ statusCode: 404, statusMessage: 'Event not found' })
  return detail
})
