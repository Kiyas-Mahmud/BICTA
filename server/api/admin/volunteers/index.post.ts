import bcrypt from 'bcryptjs'
import { useDb, schema } from '../../../database/client'
import { volunteerSchema } from '../../../utils/validation'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readValidatedBody(event, volunteerSchema.parse)
  const db = useDb()

  const passwordHash = await bcrypt.hash(body.password, 12)
  const inserted = await db
    .insert(schema.admins)
    .values({ name: body.name, email: body.email, passwordHash, role: 'volunteer' })
    .onConflictDoNothing()
    .returning({ id: schema.admins.id, name: schema.admins.name, email: schema.admins.email })

  if (!inserted.length) {
    throw createError({ statusCode: 409, statusMessage: 'An account with this email already exists.' })
  }
  return inserted[0]
})
