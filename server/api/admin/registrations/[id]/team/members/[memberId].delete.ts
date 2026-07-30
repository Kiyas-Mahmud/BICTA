import { eq, and } from 'drizzle-orm'
import { useDb, schema } from '../../../../../../database/client'
import { idParam } from '../../../../../../utils/validation'
import { syncLegacyRoster } from '../../../../../../utils/team'

// Admin override of the leader's own "remove teammate" — never blocked by the
// registration deadline. The leader row is still protected: reassign first.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const registrationId = idParam.parse(getRouterParam(event, 'id'))
  const memberId = idParam.parse(getRouterParam(event, 'memberId'))
  const db = useDb()

  const row = await db
    .select()
    .from(schema.teamMembers)
    .where(and(eq(schema.teamMembers.id, memberId), eq(schema.teamMembers.registrationId, registrationId)))
    .get()
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Team member not found' })
  if (row.role === 'leader') {
    throw createError({ statusCode: 400, statusMessage: 'Reassign the leader role to someone else before removing this person.' })
  }

  await db.delete(schema.teamMembers).where(eq(schema.teamMembers.id, memberId))
  await syncLegacyRoster(registrationId)

  return { ok: true }
})
