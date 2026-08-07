import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../database/client'
import { staffSetPasswordSchema } from '../../utils/validation'

// Accept a staff invite: exchange the emailed token for a password. Public by
// necessity — the invitee has no session yet — so the token is the only
// credential, and it is single-use and time-limited.
export default defineEventHandler(async (event) => {
  assertRateLimit(event, { bucket: 'staff-setpw', max: 30, windowMs: 60 * 60 * 1000 })

  const body = await readValidatedBody(event, staffSetPasswordSchema.parse)
  const db = useDb()

  const account = await db.select().from(schema.admins).where(eq(schema.admins.inviteToken, body.token)).get()

  const expired = Boolean(account?.inviteExpires) && new Date(account!.inviteExpires!) < new Date()
  if (!account || expired) {
    throw createError({
      statusCode: 400,
      statusMessage: expired
        ? 'This invitation has expired. Ask an administrator to send a new one.'
        : 'This link is invalid or has already been used.',
    })
  }

  // A banned account keeps its token row but must not be able to walk back in
  // by replaying the original invite.
  if (account.status === 'banned') {
    throw createError({ statusCode: 403, statusMessage: 'This account has been suspended. Contact an administrator.' })
  }

  const passwordHash = await bcrypt.hash(body.password, 12)
  await db
    .update(schema.admins)
    .set({ passwordHash, status: 'active', inviteToken: null, inviteExpires: null })
    .where(eq(schema.admins.id, account.id))

  // Sign them straight in, so accepting the invite lands on the console rather
  // than a login form they would immediately fill in again.
  await setUserSession(event, {
    user: { id: account.id, name: account.name, email: account.email, role: account.role },
  })

  return { ok: true, role: account.role }
})
