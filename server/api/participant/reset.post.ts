import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../database/client'
import { setPasswordSchema } from '../../utils/validation'

// Password reset: single-use, expiring token from the reset email.
export default defineEventHandler(async (event) => {
  assertRateLimit(event, { bucket: 'participant-reset', max: 10, windowMs: 60 * 60 * 1000 })

  const body = await readValidatedBody(event, setPasswordSchema.parse)
  const db = useDb()

  const account = db
    .select()
    .from(schema.participantAccounts)
    .where(eq(schema.participantAccounts.resetToken, body.token))
    .get()

  const expired = !account?.resetExpires || new Date(account.resetExpires) < new Date()
  if (!account || expired) {
    throw createError({ statusCode: 400, statusMessage: 'This link is invalid or has expired.' })
  }

  const passwordHash = await bcrypt.hash(body.password, 12)
  await db
    .update(schema.participantAccounts)
    .set({ passwordHash, status: 'active', resetToken: null, resetExpires: null })
    .where(eq(schema.participantAccounts.id, account.id))

  await setUserSession(event, {
    participant: { id: account.id, fullName: account.fullName, email: account.email },
  })

  return { ok: true }
})
