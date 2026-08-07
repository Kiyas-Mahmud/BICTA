import bcrypt from 'bcryptjs'
import { and, eq } from 'drizzle-orm'
import { useDb, schema } from '../../../database/client'
import { moderatorUpdateSchema, idParam } from '../../../utils/validation'
import { recordAudit } from '../../../utils/audit'

// Rename, change email, and/or reset the password. An empty password means
// "leave it as it is", so one form serves both edit and reset.
export default defineEventHandler(async (event) => {
  const actor = await requireMainAdmin(event)
  const id = idParam.parse(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, moderatorUpdateSchema.parse)
  const db = useDb()

  // Scoping the update to role='moderator' is what stops this endpoint being
  // used to take over an admin or volunteer account by guessing its id.
  const target = await db
    .select({ id: schema.admins.id })
    .from(schema.admins)
    .where(and(eq(schema.admins.id, id), eq(schema.admins.role, 'moderator')))
    .get()
  if (!target) throw createError({ statusCode: 404, statusMessage: 'Moderator not found' })

  const changingPassword = Boolean(body.password)
  const [row] = await db
    .update(schema.admins)
    .set({
      name: body.name,
      email: body.email,
      ...(changingPassword ? { passwordHash: await bcrypt.hash(body.password!, 12) } : {}),
    })
    .where(eq(schema.admins.id, id))
    .returning({ id: schema.admins.id, name: schema.admins.name, email: schema.admins.email })

  await recordAudit(actor, {
    action: 'update',
    entity: 'moderator',
    entityId: id,
    summary: changingPassword
      ? `Reset the password for moderator ${body.name} (${body.email})`
      : `Edited moderator ${body.name} (${body.email})`,
  })
  return row
})
