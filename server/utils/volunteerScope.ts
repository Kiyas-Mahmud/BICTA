import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import { useDb, schema } from '../database/client'

/**
 * Which competitions a staff member may act on.
 *
 * Admins are unscoped. A volunteer is limited to the competitions they were
 * assigned; a volunteer with no assignments yet is treated as unscoped so the
 * scanner keeps working for events that never set assignments up. Returns null
 * to mean "no restriction".
 *
 * This is the authorization source of truth for /api/staff/**; UI filtering is
 * not security.
 */
export async function allowedCompetitionIds(
  event: H3Event,
  staff: { id: number; role?: string },
): Promise<number[] | null> {
  if (staff.role !== 'volunteer') return null

  const db = useDb()
  const rows = await db
    .select({ competitionId: schema.volunteerAssignments.competitionId })
    .from(schema.volunteerAssignments)
    .where(eq(schema.volunteerAssignments.adminId, staff.id))

  return rows.length ? rows.map((r) => r.competitionId) : null
}
