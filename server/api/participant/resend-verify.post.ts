import { randomBytes } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../database/client'
import { forgotSchema } from '../../utils/validation'
import { sendMail, leaderVerifyEmail } from '../../utils/email'

// A fresh verification link for a leader whose original one expired (48h) or
// was lost. Same anti-spam + no-enumeration contract as forgot.post.ts: the
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

  if (account && account.status === 'pending') {
    const emailVerifyToken = randomBytes(32).toString('hex')
    const emailVerifyExpires = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
    await db
      .update(schema.participantAccounts)
      .set({ emailVerifyToken, emailVerifyExpires })
      .where(eq(schema.participantAccounts.id, account.id))

    // Team/competition name are cosmetic in this email and not worth a lookup
    // here — the account row alone is enough to re-send the verify link.
    const mail = await leaderVerifyEmail({
      name: account.fullName,
      teamName: '',
      competition: 'your competition',
      verifyToken: emailVerifyToken,
      checkinToken: account.checkinToken,
    })
    await sendMail({ to: account.email, ...mail })
  }

  return { ok: true }
})
