import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import { useDb, schema } from '../database/client'
import { staffCanSignIn, staffBlockedReason } from './staff'

export type StaffRole = 'admin' | 'moderator' | 'volunteer'

export interface StaffSessionUser {
  id: number
  name: string
  email: string
  role: StaffRole
}

// Security boundary for every /api/admin/** handler. Call first, before
// reading the body or touching the database.
//
// Deliberately admin OR moderator: moderators do the same day-to-day content
// work (events, competitions, registrations, judges, gallery…), so this is the
// right default for the ~60 handlers that use it. The genuinely admin-only
// surfaces — site settings, moderator management, the audit log — call
// requireMainAdmin instead, and are listed there. Volunteers never pass here;
// they only satisfy requireStaff (scan endpoints).
export async function requireAdmin(event: H3Event): Promise<StaffSessionUser> {
  const user = await requireStaff(event)
  if (user.role !== 'admin' && user.role !== 'moderator') {
    throw createError({ statusCode: 403, statusMessage: 'Admin access required' })
  }
  return user
}

// Stricter: the main admin only. Used by the handful of routes a moderator
// must never reach — /api/admin/settings.put, /api/admin/moderators/**,
// /api/admin/audit-logs. Keep that list short and explicit; anything else
// widening to moderators is intentional.
export async function requireMainAdmin(event: H3Event): Promise<StaffSessionUser> {
  const user = await requireStaff(event)
  if (user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Only the main admin can do this.' })
  }
  return user
}

// Staff = admin OR moderator OR volunteer. The entry point for every guard
// above, and for /api/staff/** (QR scanning).
//
// The account is re-read on each request rather than trusted from the sealed
// cookie. The session is self-contained, so without this a banned volunteer
// would keep working until their cookie expired — up to 30 days. One indexed
// lookup per console request is the right price for a ban that takes effect
// immediately, and for a role change to apply without re-login.
export async function requireStaff(event: H3Event): Promise<StaffSessionUser> {
  const session = await getUserSession(event)
  const user = session?.user as StaffSessionUser | undefined
  if (!user?.id) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const row = await useDb()
    .select({
      id: schema.admins.id,
      name: schema.admins.name,
      email: schema.admins.email,
      role: schema.admins.role,
      status: schema.admins.status,
      passwordHash: schema.admins.passwordHash,
    })
    .from(schema.admins)
    .where(eq(schema.admins.id, user.id))
    .get()

  if (!row) {
    // Deleted while signed in.
    await clearUserSession(event)
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  if (!staffCanSignIn(row)) {
    await clearUserSession(event)
    throw createError({ statusCode: 403, statusMessage: staffBlockedReason(row.status) })
  }

  // Sessions created before the role column default to full admin.
  return { id: row.id, name: row.name, email: row.email, role: (row.role ?? 'admin') as StaffRole }
}
