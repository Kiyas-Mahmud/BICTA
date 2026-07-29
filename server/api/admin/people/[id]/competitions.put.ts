import { eq, inArray } from 'drizzle-orm'
import { useDb, schema } from '../../../../database/client'
import { idParam, judgeAssignmentSchema } from '../../../../utils/validation'

// Replace a judge's competition assignments wholesale.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const personId = idParam.parse(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, judgeAssignmentSchema.parse)
  const db = useDb()

  const person = await db.select().from(schema.people).where(eq(schema.people.id, personId)).get()
  if (!person) throw createError({ statusCode: 404, statusMessage: 'Person not found' })

  const ids = [...new Set(body.competitionIds)]
  if (ids.length) {
    const found = await db
      .select({ id: schema.competitions.id })
      .from(schema.competitions)
      .where(inArray(schema.competitions.id, ids))
    if (found.length !== ids.length) {
      throw createError({ statusCode: 400, statusMessage: 'One of those competitions does not exist.' })
    }
  }

  // One batch = one transaction, so a judge is never left with a half-applied
  // assignment list.
  const statements = [db.delete(schema.judgeAssignments).where(eq(schema.judgeAssignments.personId, personId))]
  if (ids.length) {
    statements.push(
      db.insert(schema.judgeAssignments).values(ids.map((competitionId) => ({ personId, competitionId }))) as any,
    )
  }
  await db.batch(statements as [(typeof statements)[number], ...(typeof statements)[number][]])

  return { ok: true, competitionIds: ids }
})
