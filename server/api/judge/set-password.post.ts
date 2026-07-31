import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../database/client'
import { setPasswordSchema } from '../../utils/validation'

// Invite acceptance: exchange the emailed inviteToken for a password. Same
// shape/flow as server/api/participant/set-password.post.ts — reuses that
// schema directly since the body is identical.
export default defineEventHandler(async (event) => {
  assertRateLimit(event, { bucket: 'judge-setpw', max: 30, windowMs: 60 * 60 * 1000 })

  const body = await readValidatedBody(event, setPasswordSchema.parse)
  const db = useDb()

  const account = await db
    .select()
    .from(schema.judgeAccounts)
    .where(eq(schema.judgeAccounts.inviteToken, body.token))
    .get()

  const expired = Boolean(account?.inviteExpires) && new Date(account!.inviteExpires!) < new Date()
  if (!account || expired) {
    throw createError({
      statusCode: 400,
      statusMessage: expired
        ? 'This invite link has expired. Ask an organiser to resend it from the Judges & Speakers page.'
        : 'This link is invalid or was already used.',
    })
  }

  const passwordHash = await bcrypt.hash(body.password, 12)
  await db
    .update(schema.judgeAccounts)
    .set({ passwordHash, status: 'active', inviteToken: null, inviteExpires: null })
    .where(eq(schema.judgeAccounts.id, account.id))

  // Log them straight in — no second step.
  await setUserSession(event, {
    judge: { id: account.id, personId: account.personId, fullName: account.fullName, email: account.email },
  })

  return { ok: true }
})
