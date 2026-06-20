import { eq, asc } from 'drizzle-orm'
import { useDb, schema } from '../../../database/client'
import { idParam } from '../../../utils/validation'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = idParam.parse(getRouterParam(event, 'id'))
  const db = useDb()

  const row = db.select().from(schema.competitions).where(eq(schema.competitions.id, id)).get()
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Competition not found' })

  const prizes = await db
    .select()
    .from(schema.prizes)
    .where(eq(schema.prizes.competitionId, id))
    .orderBy(asc(schema.prizes.sortOrder))

  return { ...row, prizes }
})
