import { getLeaderboard } from '../../../../utils/queries'
import { idParam } from '../../../../utils/validation'

// Unscoped — any admin can view any competition's standings, including the
// per-judge raw breakdown (view-only; there is no admin edit of a judge's
// score in v1, only the judge who entered it can change it).
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const competitionId = idParam.parse(getRouterParam(event, 'id'))
  return getLeaderboard(competitionId)
})
