import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../database/client'
import { setPasswordSchema } from '../../utils/validation'

// Invite acceptance: exchange the emailed inviteToken for a password.
export default defineEventHandler(async (event) => {
  assertRateLimit(event, { bucket: 'participant-setpw', max: 30, windowMs: 60 * 60 * 1000 })

  const body = await readValidatedBody(event, setPasswordSchema.parse)
  const db = useDb()

  const account = await db
    .select()
    .from(schema.participantAccounts)
    .where(eq(schema.participantAccounts.inviteToken, body.token))
    .get()

  // No inviteExpires on an old, already-migrated row is treated as "always
  // valid" rather than "already expired" — the column only started being set
  // going forward, and refusing every pre-existing invite would be a needless
  // break, not a security fix.
  const expired = Boolean(account?.inviteExpires) && new Date(account!.inviteExpires!) < new Date()
  if (!account || expired) {
    throw createError({
      statusCode: 400,
      statusMessage: expired
        ? 'This invite link has expired. Ask your team leader to copy a fresh one from their dashboard.'
        : 'This link is invalid or was already used.',
    })
  }

  const passwordHash = await bcrypt.hash(body.password, 12)
  await db
    .update(schema.participantAccounts)
    .set({ passwordHash, status: 'active', inviteToken: null, inviteExpires: null })
    .where(eq(schema.participantAccounts.id, account.id))

  // Log them straight in — no second step.
  await setUserSession(event, {
    participant: { id: account.id, fullName: account.fullName, email: account.email },
  })

  return { ok: true }
})
