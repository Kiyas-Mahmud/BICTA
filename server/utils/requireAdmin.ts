import type { H3Event } from 'h3'

export interface StaffSessionUser {
  id: number
  name: string
  email: string
  role: 'admin' | 'volunteer'
}

// Security boundary for every /api/admin/** handler. Call first, before
// reading the body or touching the database. Volunteers are NOT admins:
// they only pass requireStaff (scan endpoints).
export async function requireAdmin(event: H3Event): Promise<StaffSessionUser> {
  const user = await requireStaff(event)
  if (user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Admin access required' })
  }
  return user
}

// Staff = admin OR volunteer. Used only by /api/staff/** (QR scanning).
export async function requireStaff(event: H3Event): Promise<StaffSessionUser> {
  const session = await getUserSession(event)
  const user = session?.user as StaffSessionUser | undefined
  if (!user?.id) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  // Sessions created before the role column default to full admin.
  return { ...user, role: user.role ?? 'admin' }
}
