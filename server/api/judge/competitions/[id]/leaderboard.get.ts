import { assignedCompetitionIds } from '../../../../utils/judgeScope'
import { getLeaderboard } from '../../../../utils/queries'
import { idParam } from '../../../../utils/validation'

// No judgingOpen gate here — judges can watch standings-so-far live, that's
// the point of showing them a leaderboard at all.
export default defineEventHandler(async (event) => {
  const judge = await requireJudge(event)
  const competitionId = idParam.parse(getRouterParam(event, 'id'))

  const allowed = await assignedCompetitionIds(judge.id)
  if (!allowed.includes(competitionId)) {
    throw createError({ statusCode: 403, statusMessage: 'You are not assigned to judge this competition.' })
  }

  const board = await getLeaderboard(competitionId)
  // Strip the per-judge raw breakdown — that's an admin-only view.
  return {
    ...board,
    teams: board.teams.map(({ judgeBreakdown, ...t }) => t),
  }
})
