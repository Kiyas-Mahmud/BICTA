import { randomBytes } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../database/client'
import { forgotSchema } from '../../utils/validation'
import { sendMail, leaderSetPasswordEmail } from '../../utils/email'
import { INVITE_TTL_MS } from '../../utils/invites'

// A fresh set-password link for a leader whose original one expired or was
// lost. Same anti-spam + no-enumeration contract as forgot.post.ts: the
// response never reveals whether the address exists or what state it is in.
export default defineEventHandler(async (event) => {
  assertRateLimit(event, { bucket: 'participant-resend-verify', max: 20, windowMs: 60 * 60 * 1000 })

  const body = await readValidatedBody(event, forgotSchema.parse)

  if (body.website !== '') return { ok: true } // honeypot

  const renderedAt = Number(body.formToken)
  if (!Number.isFinite(renderedAt) || Date.now() - renderedAt < 3000) {
    throw createError({ statusCode: 400, statusMessage: 'Submission rejected. Please try again.' })
  }

  const db = useDb()
  const account = await db
    .select()
    .from(schema.participantAccounts)
    .where(eq(schema.participantAccounts.email, body.email))
    .get()

  // 'invited' is the current state for an account waiting on its set-password
  // link; 'pending' only remains for rows created before that flow replaced
  // the separate verify step, and is re-issued the same link.
  if (account && account.status !== 'active') {
    const inviteToken = randomBytes(32).toString('hex')
    const inviteExpires = new Date(Date.now() + INVITE_TTL_MS).toISOString()
    await db
      .update(schema.participantAccounts)
      .set({ status: 'invited', inviteToken, inviteExpires, emailVerifyToken: null, emailVerifyExpires: null })
      .where(eq(schema.participantAccounts.id, account.id))

    // Team/competition name are cosmetic in this email and not worth a lookup
    // here — the account row alone is enough to re-send the link.
    const mail = await leaderSetPasswordEmail({
      name: account.fullName,
      teamName: '',
      competition: 'your competition',
      inviteToken,
      checkinToken: account.checkinToken,
    })
    await sendMail({ to: account.email, ...mail })
  }

  return { ok: true }
})
