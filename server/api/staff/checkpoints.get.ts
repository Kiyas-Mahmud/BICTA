import { eq, and, asc, or, isNull, inArray } from 'drizzle-orm'
import { useDb, schema } from '../../database/client'
import { allowedCompetitionIds } from '../../utils/volunteerScope'

// Checkpoints the scanner can mark right now: current event, active, and —
// for an assigned volunteer — only event-wide desks plus the ones belonging to
// their own competitions.
export default defineEventHandler(async (event) => {
  const staff = await requireStaff(event)
  const db = useDb()

  const current = await db
    .select({ id: schema.events.id, qrCheckIn: schema.events.qrCheckIn })
    .from(schema.events)
    .where(eq(schema.events.isCurrent, true))
    .get()
  if (!current) return []
  // QR check-in switched off: show no desks at all, so a volunteer is never
  // offered a scan that checkin.post.ts would only reject.
  if (!current.qrCheckIn) return []

  const allowed = await allowedCompetitionIds(event, staff)

  return db
    .select()
    .from(schema.checkpoints)
    .where(
      and(
        eq(schema.checkpoints.eventId, current.id),
        eq(schema.checkpoints.active, true),
        allowed
          ? or(isNull(schema.checkpoints.competitionId), inArray(schema.checkpoints.competitionId, allowed))
          : undefined,
      ),
    )
    .orderBy(asc(schema.checkpoints.sortOrder))
})
