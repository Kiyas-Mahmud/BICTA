import { randomBytes } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../../../database/client'
import { judgeInviteSchema, idParam } from '../../../../utils/validation'
import { sendMail, judgeInviteEmail } from '../../../../utils/email'
import { recordAudit } from '../../../../utils/audit'

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // matches participant invite window

// Creates or resends a judge portal login for a `people` row (role='judge').
// Resending an already-invited account regenerates its token in place — this
// doubles as the only "reset" mechanism for a small, admin-curated judge pool
// (no self-service forgot-password in v1).
export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const personId = idParam.parse(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, judgeInviteSchema.parse)
  const db = useDb()

  const person = await db.select().from(schema.people).where(eq(schema.people.id, personId)).get()
  if (!person) throw createError({ statusCode: 404, statusMessage: 'Person not found' })
  if (person.role !== 'judge') throw createError({ statusCode: 400, statusMessage: 'Only judges can be invited to the judge portal' })

  const existing = await db.select().from(schema.judgeAccounts).where(eq(schema.judgeAccounts.personId, personId)).get()

  if (existing?.status === 'active') {
    throw createError({
      statusCode: 400,
      statusMessage: 'This judge already has an active account. There is no self-service password reset yet.',
    })
  }

  const inviteToken = randomBytes(32).toString('hex')
  const inviteExpires = new Date(Date.now() + INVITE_TTL_MS).toISOString()

  let account: typeof schema.judgeAccounts.$inferSelect
  if (existing) {
    // Resend: regenerate the token, optionally correct the email.
    ;[account] = await db
      .update(schema.judgeAccounts)
      .set({ email: body.email, inviteToken, inviteExpires, fullName: person.name })
      .where(eq(schema.judgeAccounts.id, existing.id))
      .returning()
  } else {
    try {
      ;[account] = await db
        .insert(schema.judgeAccounts)
        .values({ personId, email: body.email, fullName: person.name, status: 'invited', inviteToken, inviteExpires })
        .returning()
    } catch {
      throw createError({ statusCode: 400, statusMessage: 'That email is already used by another judge account.' })
    }
  }

  await sendMail({ to: account!.email, ...judgeInviteEmail({ name: person.name, inviteToken }) })

  await recordAudit(actor, { action: 'create', entity: 'judge', entityId: personId, summary: `Invited ${person.name} as a judge (${body.email})` })
  return { ok: true, status: 'invited' as const }
})
