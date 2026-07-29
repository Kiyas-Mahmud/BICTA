import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../../../database/client'
import { idParam } from '../../../../utils/validation'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const adminId = idParam.parse(getRouterParam(event, 'id'))
  const db = useDb()

  const rows = await db
    .select({ checkpointId: schema.checkpointVolunteers.checkpointId })
    .from(schema.checkpointVolunteers)
    .where(eq(schema.checkpointVolunteers.adminId, adminId))

  return { checkpointIds: rows.map((r) => r.checkpointId) }
})
