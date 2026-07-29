import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../../../database/client'
import { idParam } from '../../../../utils/validation'

// Competition ids this judge is assigned to score.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const personId = idParam.parse(getRouterParam(event, 'id'))
  const db = useDb()

  const rows = await db
    .select({ competitionId: schema.judgeAssignments.competitionId })
    .from(schema.judgeAssignments)
    .where(eq(schema.judgeAssignments.personId, personId))

  return { competitionIds: rows.map((r) => r.competitionId) }
})
