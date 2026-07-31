import { z } from 'zod'
import { asc, eq } from 'drizzle-orm'
import { useDb, schema } from '../../../database/client'

const query = z.object({ competitionId: z.coerce.number().int().positive().optional() })

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { competitionId } = await getValidatedQuery(event, query.parse)
  return useDb()
    .select()
    .from(schema.applicationFields)
    .where(competitionId ? eq(schema.applicationFields.competitionId, competitionId) : undefined)
    .orderBy(asc(schema.applicationFields.sortOrder))
})
