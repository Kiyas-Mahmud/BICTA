import { and, eq } from 'drizzle-orm'
import { useDb, schema } from '../../../database/client'
import { staffUpdateSchema, idParam } from '../../../utils/validation'
import { recordAudit } from '../../../utils/audit'

// Rename, correct the address, or ban/unban. Scoped to role='volunteer' so
// this endpoint can never be pointed at an admin or moderator account by id.
export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const id = idParam.parse(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, staffUpdateSchema.parse)
  const db = useDb()

  const target = await db
    .select()
    .from(schema.admins)
    .where(and(eq(schema.admins.id, id), eq(schema.admins.role, 'volunteer')))
    .get()
  if (!target) throw createError({ statusCode: 404, statusMessage: 'Volunteer not found' })

  // Un-banning someone who never accepted their invite returns them to
  // 'invited', not 'active' — they still have no password.
  let status = body.status ?? target.status
  if (body.status === 'active' && !target.passwordHash) status = 'invited'

  const [row] = await db
    .update(schema.admins)
    .set({ name: body.name, email: body.email, status })
    .where(eq(schema.admins.id, id))
    .returning({
      id: schema.admins.id,
      name: schema.admins.name,
      email: schema.admins.email,
      status: schema.admins.status,
    })

  const changedStatus = body.status && body.status !== target.status
  await recordAudit(actor, {
    action: 'update',
    entity: 'volunteer',
    entityId: id,
    summary: changedStatus
      ? `${body.status === 'banned' ? 'Banned' : 'Restored'} volunteer ${body.name} (${body.email})`
      : `Edited volunteer ${body.name} (${body.email})`,
  })
  return row
})
