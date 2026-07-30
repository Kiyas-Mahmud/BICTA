import { eq, and } from 'drizzle-orm'
import { useDb, schema } from '../../../../../database/client'
import { idParam, reassignLeaderSchema } from '../../../../../utils/validation'
import { syncLegacyRoster } from '../../../../../utils/team'

// Admin override: swap who holds the 'leader' role on a team. Unlike the
// participant-facing endpoints this never checks the registration deadline —
// a leader who has gone unreachable is exactly the case an admin needs to fix
// after the deadline, not before it.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const registrationId = idParam.parse(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, reassignLeaderSchema.parse)
  const db = useDb()

  const rows = await db
    .select()
    .from(schema.teamMembers)
    .where(eq(schema.teamMembers.registrationId, registrationId))
  if (!rows.length) throw createError({ statusCode: 404, statusMessage: 'Team not found' })

  const currentLeader = rows.find((r) => r.role === 'leader')
  const target = rows.find((r) => r.accountId === body.accountId)
  if (!target) throw createError({ statusCode: 404, statusMessage: 'That person is not on this team' })
  if (target.role === 'leader') return { ok: true }

  await db.batch([
    db
      .update(schema.teamMembers)
      .set({ role: 'member' })
      .where(and(eq(schema.teamMembers.registrationId, registrationId), eq(schema.teamMembers.role, 'leader'))),
    db
      .update(schema.teamMembers)
      .set({ role: 'leader' })
      .where(and(eq(schema.teamMembers.registrationId, registrationId), eq(schema.teamMembers.accountId, body.accountId))),
  ])

  await syncLegacyRoster(registrationId)
  return { ok: true, previousLeaderAccountId: currentLeader?.accountId ?? null }
})
