import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../database/client'
import { setPasswordSchema } from '../../utils/validation'

// Invite acceptance: exchange the emailed inviteToken for a password.
export default defineEventHandler(async (event) => {
  assertRateLimit(event, { bucket: 'participant-setpw', max: 10, windowMs: 60 * 60 * 1000 })

  const body = await readValidatedBody(event, setPasswordSchema.parse)
  const db = useDb()

  const account = db
    .select()
    .from(schema.participantAccounts)
    .where(eq(schema.participantAccounts.inviteToken, body.token))
    .get()

  if (!account) {
    throw createError({ statusCode: 400, statusMessage: 'This link is invalid or was already used.' })
  }

  const passwordHash = await bcrypt.hash(body.password, 12)
  await db
    .update(schema.participantAccounts)
    .set({ passwordHash, status: 'active', inviteToken: null })
    .where(eq(schema.participantAccounts.id, account.id))

  // Log them straight in — no second step.
  await setUserSession(event, {
    participant: { id: account.id, fullName: account.fullName, email: account.email },
  })

  return { ok: true }
})
