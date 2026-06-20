import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../../database/client'
import { passwordChangeSchema } from '../../../utils/validation'

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const body = await readValidatedBody(event, passwordChangeSchema.parse)
  const db = useDb()

  const admin = db.select().from(schema.admins).where(eq(schema.admins.id, user.id)).get()
  if (!admin) throw createError({ statusCode: 404, statusMessage: 'Account not found' })

  const valid = await bcrypt.compare(body.currentPassword, admin.passwordHash)
  if (!valid) throw createError({ statusCode: 401, statusMessage: 'Current password is incorrect' })

  const passwordHash = await bcrypt.hash(body.newPassword, 12)
  await db.update(schema.admins).set({ passwordHash }).where(eq(schema.admins.id, admin.id))

  return { ok: true }
})
