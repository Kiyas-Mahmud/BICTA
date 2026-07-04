import { randomBytes } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../database/client'
import { forgotSchema } from '../../utils/validation'
import { sendMail, resetEmail } from '../../utils/email'

// Public form endpoint — full anti-spam contract + no account enumeration:
// the response is identical whether or not the email exists.
export default defineEventHandler(async (event) => {
  assertRateLimit(event, { bucket: 'participant-forgot', max: 5, windowMs: 60 * 60 * 1000 })

  const body = await readValidatedBody(event, forgotSchema.parse)

  if (body.website !== '') return { ok: true } // honeypot

  const renderedAt = Number(body.formToken)
  if (!Number.isFinite(renderedAt) || Date.now() - renderedAt < 3000) {
    throw createError({ statusCode: 400, statusMessage: 'Submission rejected. Please try again.' })
  }

  const db = useDb()
  const account = db
    .select()
    .from(schema.participantAccounts)
    .where(eq(schema.participantAccounts.email, body.email))
    .get()

  if (account && account.status === 'active') {
    const resetToken = randomBytes(32).toString('hex')
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1h
    await db
      .update(schema.participantAccounts)
      .set({ resetToken, resetExpires })
      .where(eq(schema.participantAccounts.id, account.id))
    await sendMail({ to: account.email, ...resetEmail({ name: account.fullName, resetToken }) })
  }

  return { ok: true }
})
