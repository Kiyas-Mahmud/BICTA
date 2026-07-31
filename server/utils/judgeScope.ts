import { eq } from 'drizzle-orm'
import { useDb, schema } from '../database/client'

/**
 * Which competitions a judge may score. Unlike volunteers there is no
 * "unscoped" judge concept — this always returns a concrete (possibly empty)
 * array. Every /api/judge/** handler must 403 when the requested competition
 * isn't in it; an empty array must never be read as "show everything."
 *
 * This is the authorization source of truth; UI filtering is not security.
 */
export async function assignedCompetitionIds(judgeId: number): Promise<number[]> {
  const db = useDb()
  const rows = await db
    .select({ competitionId: schema.judgeAssignments.competitionId })
    .from(schema.judgeAssignments)
    .innerJoin(schema.people, eq(schema.people.id, schema.judgeAssignments.personId))
    .innerJoin(schema.judgeAccounts, eq(schema.judgeAccounts.personId, schema.people.id))
    .where(eq(schema.judgeAccounts.id, judgeId))
  return rows.map((r) => r.competitionId)
}
