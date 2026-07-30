import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../database/client'
import { verifyEmailSchema } from '../../utils/validation'

// Email verification: exchange the emailed token for an active account. The
// leader already has a password (chosen at registration) — this step only
// proves inbox ownership, matching what the invite-link flow already does
// implicitly for teammates.
export default defineEventHandler(async (event) => {
  assertRateLimit(event, { bucket: 'participant-verify', max: 30, windowMs: 60 * 60 * 1000 })

  const body = await readValidatedBody(event, verifyEmailSchema.parse)
  const db = useDb()

  const account = await db
    .select()
    .from(schema.participantAccounts)
    .where(eq(schema.participantAccounts.emailVerifyToken, body.token))
    .get()

  const expired = !account?.emailVerifyExpires || new Date(account.emailVerifyExpires) < new Date()
  if (!account || expired) {
    throw createError({ statusCode: 400, statusMessage: 'This link is invalid or has expired.' })
  }

  await db
    .update(schema.participantAccounts)
    .set({ status: 'active', emailVerifyToken: null, emailVerifyExpires: null })
    .where(eq(schema.participantAccounts.id, account.id))

  // Log them straight in — no second step, same pattern as set-password/reset.
  await setUserSession(event, {
    participant: { id: account.id, fullName: account.fullName, email: account.email },
  })

  return { ok: true }
})
