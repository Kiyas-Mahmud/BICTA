import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../../../database/client'
import { idParam } from '../../../../utils/validation'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const adminId = idParam.parse(getRouterParam(event, 'id'))
  const db = useDb()

  const rows = await db
    .select({ competitionId: schema.volunteerAssignments.competitionId, eventId: schema.volunteerAssignments.eventId })
    .from(schema.volunteerAssignments)
    .where(eq(schema.volunteerAssignments.adminId, adminId))

  return { competitionIds: rows.map((r) => r.competitionId), eventId: rows[0]?.eventId ?? null }
})
