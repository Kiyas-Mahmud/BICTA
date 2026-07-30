import { z } from 'zod'
import { getCompetitionDetail } from '../../../../utils/queries'

const slugOrId = z.string().trim().min(1).max(120)

/**
 * One competition in full: rules, submission guidelines, evaluation criteria,
 * resources, prizes, judging criteria, schedule, its own judges and FAQs.
 * Both path segments accept a slug (canonical) or a legacy numeric id; the
 * event segment is validated against the competition's real parent so a
 * mismatched URL 404s instead of rendering under the wrong event.
 */
export default defineEventHandler(async (event) => {
  const eventKey = slugOrId.parse(getRouterParam(event, 'id'))
  const compKey = slugOrId.parse(getRouterParam(event, 'compId'))

  const detail = await getCompetitionDetail(compKey)
  const parentMatches =
    detail && (/^\d+$/.test(eventKey) ? detail.eventId === Number(eventKey) : detail.event.slug === eventKey)
  if (!detail || !parentMatches) {
    throw createError({ statusCode: 404, statusMessage: 'Competition not found' })
  }
  return detail
})
