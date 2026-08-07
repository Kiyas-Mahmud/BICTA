import { randomBytes } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { useDb, schema } from '../../../../database/client'
import { idParam } from '../../../../utils/validation'
import { sendMail, staffInviteEmail } from '../../../../utils/email'
import { recordAudit } from '../../../../utils/audit'
import { STAFF_INVITE_TTL_MS } from '../../../../utils/staff'

// Send a fresh invitation — for a link that expired, never arrived, or an
// account that needs its password reset. Rotating the token invalidates the
// old link, so this doubles as the reset mechanism for staff.
export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const id = idParam.parse(getRouterParam(event, 'id'))
  const db = useDb()

  const target = await db
    .select()
    .from(schema.admins)
    .where(and(eq(schema.admins.id, id), eq(schema.admins.role, 'volunteer')))
    .get()
  if (!target) throw createError({ statusCode: 404, statusMessage: 'Volunteer not found' })
  if (target.status === 'banned') {
    throw createError({ statusCode: 409, statusMessage: 'Restore this volunteer before sending a new invitation.' })
  }

  const inviteToken = randomBytes(32).toString('hex')
  await db
    .update(schema.admins)
    .set({
      inviteToken,
      inviteExpires: new Date(Date.now() + STAFF_INVITE_TTL_MS).toISOString(),
      // Back to 'invited': the new link is now the only way in, and any
      // existing password stops working until it is used.
      status: 'invited',
      passwordHash: '',
    })
    .where(eq(schema.admins.id, id))

  await sendMail({
    to: target.email,
    ...staffInviteEmail({ name: target.name, inviteToken, role: 'volunteer' }),
  })

  await recordAudit(actor, {
    action: 'update',
    entity: 'volunteer',
    entityId: id,
    summary: `Sent a new invitation to ${target.name} (${target.email})`,
  })
  return { ok: true }
})
