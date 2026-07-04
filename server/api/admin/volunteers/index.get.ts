import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../../database/client'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return useDb()
    .select({ id: schema.admins.id, name: schema.admins.name, email: schema.admins.email })
    .from(schema.admins)
    .where(eq(schema.admins.role, 'volunteer'))
})
