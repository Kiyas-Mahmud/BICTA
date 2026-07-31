import { eq, and, inArray } from 'drizzle-orm'
import { useDb, schema } from '../../../../database/client'
import { assignedCompetitionIds } from '../../../../utils/judgeScope'
import { getScoringCriteria } from '../../../../utils/queries'
import { idParam } from '../../../../utils/validation'

// Confirmed teams in an assigned competition, plus this judge's own existing
// scores (keyed by criterionId) so the scoring UI can pre-fill and show which
// teams are already complete.
export default defineEventHandler(async (event) => {
  const judge = await requireJudge(event)
  const competitionId = idParam.parse(getRouterParam(event, 'id'))

  const allowed = await assignedCompetitionIds(judge.id)
  if (!allowed.includes(competitionId)) {
    throw createError({ statusCode: 403, statusMessage: 'You are not assigned to judge this competition.' })
  }

  const db = useDb()
  const comp = await db
    .select({ id: schema.competitions.id, name: schema.competitions.name, judgingOpen: schema.competitions.judgingOpen })
    .from(schema.competitions)
    .where(eq(schema.competitions.id, competitionId))
    .get()
  if (!comp) throw createError({ statusCode: 404, statusMessage: 'Competition not found' })

  const [criteria, teams] = await Promise.all([
    getScoringCriteria(competitionId),
    db
      .select({
        id: schema.registrations.id,
        teamName: schema.registrations.teamName,
        fullName: schema.registrations.fullName,
        institution: schema.registrations.institution,
      })
      .from(schema.registrations)
      .where(and(eq(schema.registrations.competitionId, competitionId), eq(schema.registrations.status, 'confirmed'))),
  ])

  const teamIds = teams.map((t) => t.id)
  const myScores = teamIds.length
    ? await db
        .select()
        .from(schema.scores)
        .where(and(eq(schema.scores.judgeId, judge.id), inArray(schema.scores.registrationId, teamIds)))
    : []

  const criteriaCount = criteria.length
  const results = teams.map((team) => {
    const rows = myScores.filter((s) => s.registrationId === team.id)
    return {
      ...team,
      scores: Object.fromEntries(rows.map((r) => [r.criterionId, { value: r.value, note: r.note }])),
      complete: criteriaCount > 0 && rows.length === criteriaCount,
    }
  })

  return {
    competition: { id: comp.id, name: comp.name, judgingOpen: comp.judgingOpen },
    criteria: criteria.map((c) => ({ id: c.id, name: c.name, description: c.description, weight: c.weight, icon: c.icon })),
    teams: results,
  }
})
