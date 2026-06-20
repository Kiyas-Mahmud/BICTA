import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../../database/client'

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(200),
})

export default defineEventHandler(async (event) => {
  assertRateLimit(event, { bucket: 'login', max: 5, windowMs: 15 * 60 * 1000 })

  const body = await readValidatedBody(event, loginSchema.parse)

  const db = useDb()
  const admin = db.select().from(schema.admins).where(eq(schema.admins.email, body.email)).get()

  // Compare against a dummy hash when the email is unknown so response time
  // does not reveal whether the account exists.
  const hash = admin?.passwordHash ?? '$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva'
  const valid = await bcrypt.compare(body.password, hash)

  if (!admin || !valid) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })
  }

  await setUserSession(event, {
    user: { id: admin.id, name: admin.name, email: admin.email },
  })

  return { ok: true }
})
