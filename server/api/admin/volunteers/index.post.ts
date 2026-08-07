import { randomBytes } from 'node:crypto'
import { useDb, schema } from '../../../database/client'
import { volunteerSchema } from '../../../utils/validation'
import { sendMail, staffInviteEmail } from '../../../utils/email'
import { recordAudit } from '../../../utils/audit'
import { STAFF_INVITE_TTL_MS } from '../../../utils/staff'

// Invite a volunteer. The admin supplies a name and an email; the volunteer
// sets their own password from the emailed link. Until they do, the account is
// 'invited' and login refuses it — so an address typed here never becomes a
// usable account without someone proving they can read that inbox.
export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const body = await readValidatedBody(event, volunteerSchema.parse)

  const inviteToken = randomBytes(32).toString('hex')
  const inserted = await useDb()
    .insert(schema.admins)
    .values({
      name: body.name,
      email: body.email,
      // Not a valid bcrypt hash, and never passed to compare(). See
      // 0016_staff_invites.sql for why the column cannot simply be nullable.
      passwordHash: '',
      role: 'volunteer',
      status: 'invited',
      inviteToken,
      inviteExpires: new Date(Date.now() + STAFF_INVITE_TTL_MS).toISOString(),
      createdAt: new Date().toISOString(),
    })
    .onConflictDoNothing()
    .returning({ id: schema.admins.id, name: schema.admins.name, email: schema.admins.email })

  if (!inserted.length) {
    throw createError({ statusCode: 409, statusMessage: 'An account with this email already exists.' })
  }

  await sendMail({
    to: body.email,
    ...staffInviteEmail({ name: body.name, inviteToken, role: 'volunteer' }),
  })

  await recordAudit(actor, {
    action: 'create',
    entity: 'volunteer',
    entityId: inserted[0]!.id,
    summary: `Invited volunteer ${body.name} (${body.email})`,
  })
  return { ...inserted[0], status: 'invited' as const }
})
