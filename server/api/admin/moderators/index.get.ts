import { eq, asc } from 'drizzle-orm'
import { useDb, schema } from '../../../database/client'

// Main admin only: moderators are an access-control surface, so neither the
// list nor any of its writes are visible to moderators themselves.
export default defineEventHandler(async (event) => {
  await requireMainAdmin(event)
  return useDb()
    .select({
      id: schema.admins.id,
      name: schema.admins.name,
      email: schema.admins.email,
      createdAt: schema.admins.createdAt,
    })
    .from(schema.admins)
    .where(eq(schema.admins.role, 'moderator'))
    .orderBy(asc(schema.admins.name))
})
