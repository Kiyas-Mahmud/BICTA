import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../database/client'

// Single sign-in door for all three account types (admin, volunteer,
// participant). One email can only ever exist in one of the two tables, so
// looking both up and resolving to whichever matched is unambiguous.
//
// Anti-enumeration: exactly one bcrypt.compare runs per request, against
// whichever hash is relevant (or a dummy hash if nothing matched), so
// response time never reveals which table — or whether either — has the
// email. Same contract the two endpoints this replaces already used.
const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(200),
})

const DUMMY_HASH = '$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva'

export default defineEventHandler(async (event) => {
  assertRateLimit(event, { bucket: 'login', max: 20, windowMs: 15 * 60 * 1000 })

  const body = await readValidatedBody(event, loginSchema.parse)
  const db = useDb()

  const [admin, participant] = await Promise.all([
    db.select().from(schema.admins).where(eq(schema.admins.email, body.email)).get(),
    db.select().from(schema.participantAccounts).where(eq(schema.participantAccounts.email, body.email)).get(),
  ])

  const participantUsable = participant && participant.status === 'active' && participant.passwordHash

  const hash = admin?.passwordHash ?? (participantUsable ? participant!.passwordHash! : DUMMY_HASH)
  const valid = await bcrypt.compare(body.password, hash)

  if (!valid || (!admin && !participantUsable)) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })
  }

  if (admin) {
    await setUserSession(event, {
      user: { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
    })
    // Client routes volunteers to the scanner, admins to the panel.
    return { ok: true, kind: 'staff' as const, role: admin.role }
  }

  // Merge into the session under a separate key; never touches `user` (staff).
  await setUserSession(event, {
    participant: { id: participant!.id, fullName: participant!.fullName, email: participant!.email },
  })
  return { ok: true, kind: 'participant' as const }
})
