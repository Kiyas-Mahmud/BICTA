import bcrypt from 'bcryptjs'
import { useDb, schema } from '../../../database/client'
import { moderatorSchema } from '../../../utils/validation'
import { recordAudit } from '../../../utils/audit'

export default defineEventHandler(async (event) => {
  const actor = await requireMainAdmin(event)
  const body = await readValidatedBody(event, moderatorSchema.parse)

  const passwordHash = await bcrypt.hash(body.password, 12)
  // onConflictDoNothing rather than a pre-read: the unique index on email is
  // the real guard, and checking first would leave a race between the two.
  const inserted = await useDb()
    .insert(schema.admins)
    .values({
      name: body.name,
      email: body.email,
      passwordHash,
      role: 'moderator',
      createdAt: new Date().toISOString(),
    })
    .onConflictDoNothing()
    .returning({ id: schema.admins.id, name: schema.admins.name, email: schema.admins.email })

  if (!inserted.length) {
    throw createError({ statusCode: 409, statusMessage: 'An account with this email already exists.' })
  }

  await recordAudit(actor, {
    action: 'create',
    entity: 'moderator',
    entityId: inserted[0]!.id,
    summary: `Added moderator ${body.name} (${body.email})`,
  })
  return inserted[0]
})
