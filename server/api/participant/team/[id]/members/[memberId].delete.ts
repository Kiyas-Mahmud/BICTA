import { eq, and } from 'drizzle-orm'
import { useDb, schema } from '../../../../../database/client'
import { idParam } from '../../../../../utils/validation'
import { requireTeamLeader, syncLegacyRoster } from '../../../../../utils/team'

// Leader removes a teammate (never themselves — the leader row is protected).
export default defineEventHandler(async (event) => {
  const registrationId = idParam.parse(getRouterParam(event, 'id'))
  const memberId = idParam.parse(getRouterParam(event, 'memberId'))
  await requireTeamLeader(event, registrationId)
  const db = useDb()

  const row = db
    .select()
    .from(schema.teamMembers)
    .where(and(eq(schema.teamMembers.id, memberId), eq(schema.teamMembers.registrationId, registrationId)))
    .get()
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Team member not found' })
  if (row.role === 'leader') {
    throw createError({ statusCode: 400, statusMessage: 'The team leader cannot be removed.' })
  }

  await db.delete(schema.teamMembers).where(eq(schema.teamMembers.id, memberId))
  await syncLegacyRoster(registrationId)

  return { ok: true }
})
