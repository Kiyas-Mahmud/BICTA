import { and, eq } from 'drizzle-orm'
import { useDb, schema } from '../../../database/client'
import { idParam } from '../../../utils/validation'
import { recordAudit } from '../../../utils/audit'

export default defineEventHandler(async (event) => {
  const actor = await requireMainAdmin(event)
  const id = idParam.parse(getRouterParam(event, 'id'))
  const db = useDb()

  // Read first so the audit line can name who was removed, and scope to
  // role='moderator' so this can never delete an admin or a volunteer.
  const target = await db
    .select({ id: schema.admins.id, name: schema.admins.name, email: schema.admins.email })
    .from(schema.admins)
    .where(and(eq(schema.admins.id, id), eq(schema.admins.role, 'moderator')))
    .get()
  if (!target) throw createError({ statusCode: 404, statusMessage: 'Moderator not found' })

  await db.delete(schema.admins).where(eq(schema.admins.id, id))

  // Their audit history survives: audit_logs.actor_id is ON DELETE SET NULL
  // and the name/email were denormalised at write time.
  await recordAudit(actor, {
    action: 'delete',
    entity: 'moderator',
    entityId: id,
    summary: `Removed moderator ${target.name} (${target.email})`,
  })
  return { ok: true }
})
