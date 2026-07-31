import { eq, and, inArray, count } from 'drizzle-orm'
import { useDb, schema } from '../../database/client'
import { assignedCompetitionIds } from '../../utils/judgeScope'

// Assigned competitions for the judge dashboard: name, parent event, whether
// scoring is currently open, and how many confirmed teams / criteria exist so
// the picker can show useful context before drilling in.
export default defineEventHandler(async (event) => {
  const judge = await requireJudge(event)
  const db = useDb()

  const competitionIds = await assignedCompetitionIds(judge.id)
  if (!competitionIds.length) return []

  const comps = await db
    .select({
      id: schema.competitions.id,
      name: schema.competitions.name,
      slug: schema.competitions.slug,
      judgingOpen: schema.competitions.judgingOpen,
      eventId: schema.events.id,
      eventTitle: schema.events.title,
    })
    .from(schema.competitions)
    .innerJoin(schema.events, eq(schema.events.id, schema.competitions.eventId))
    .where(inArray(schema.competitions.id, competitionIds))

  const [teamCounts, criteriaCounts] = await Promise.all([
    db
      .select({ competitionId: schema.registrations.competitionId, n: count() })
      .from(schema.registrations)
      .where(and(inArray(schema.registrations.competitionId, competitionIds), eq(schema.registrations.status, 'confirmed')))
      .groupBy(schema.registrations.competitionId),
    db
      .select({ competitionId: schema.judgingCriteria.competitionId, n: count() })
      .from(schema.judgingCriteria)
      .where(inArray(schema.judgingCriteria.competitionId, competitionIds))
      .groupBy(schema.judgingCriteria.competitionId),
  ])
  const teamByComp = Object.fromEntries(teamCounts.map((r) => [r.competitionId, r.n]))
  const criteriaByComp = Object.fromEntries(criteriaCounts.map((r) => [r.competitionId, r.n]))

  return comps.map((c) => ({
    ...c,
    teamCount: teamByComp[c.id] ?? 0,
    // Competition-specific criteria only — event-wide ones aren't counted per
    // competition here; this is just a rough "is there anything to score yet"
    // signal for the dashboard card, not used for scoring itself.
    criteriaCount: criteriaByComp[c.id] ?? 0,
  }))
})
