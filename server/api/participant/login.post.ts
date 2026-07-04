import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../database/client'
import { participantLoginSchema } from '../../utils/validation'

export default defineEventHandler(async (event) => {
  assertRateLimit(event, { bucket: 'participant-login', max: 5, windowMs: 15 * 60 * 1000 })

  const body = await readValidatedBody(event, participantLoginSchema.parse)
  const db = useDb()

  const account = db
    .select()
    .from(schema.participantAccounts)
    .where(eq(schema.participantAccounts.email, body.email))
    .get()

  // Same anti-enumeration contract as admin login: constant-time-ish compare
  // against a dummy hash and one generic error for every failure mode.
  const hash = account?.passwordHash ?? '$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva'
  const valid = await bcrypt.compare(body.password, hash)

  if (!account || !account.passwordHash || account.status !== 'active' || !valid) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })
  }

  // Merge into the session under a separate key; never touches `user` (staff).
  await setUserSession(event, {
    participant: { id: account.id, fullName: account.fullName, email: account.email },
  })

  return { ok: true }
})
