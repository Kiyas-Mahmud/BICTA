import type { H3Event } from 'h3'

export interface AdminSessionUser {
  id: number
  name: string
  email: string
}

// Security boundary for every /api/admin/** handler. Call first, before
// reading the body or touching the database.
export async function requireAdmin(event: H3Event): Promise<AdminSessionUser> {
  const session = await getUserSession(event)
  const user = session?.user as AdminSessionUser | undefined
  if (!user?.id) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  return user
}
