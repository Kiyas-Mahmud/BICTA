import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../database/client'
import { checkinSchema } from '../../utils/validation'
import { allowedCompetitionIds } from '../../utils/volunteerScope'
import { competitionWindow } from '../../utils/competitionWindow'

// Mark one collectible as collected for one participation.
//
// Validation order is the security contract, and nothing is written until all
// of it passes:
//   QR/membership -> volunteer scope -> checkpoint -> competition match
//   -> event date/time window -> collection status
//
// The time and competition checks live here rather than only in the scanner UI
// because the UI is not a control: a modified client could POST directly.
export default defineEventHandler(async (event) => {
  const staff = await requireStaff(event)
  const body = await readValidatedBody(event, checkinSchema.parse)
  const db = useDb()

  // 1. The participation being checked in, resolved from the QR's membership.
  const membership = await db
    .select({
      id: schema.teamMembers.id,
      accountId: schema.teamMembers.accountId,
      competitionId: schema.teamMembers.competitionId,
      competition: schema.competitions.name,
      startsAt: schema.competitions.startsAt,
      endsAt: schema.competitions.endsAt,
      eventStart: schema.events.startDate,
      eventEnd: schema.events.endDate,
    })
    .from(schema.teamMembers)
    .innerJoin(schema.competitions, eq(schema.competitions.id, schema.teamMembers.competitionId))
    .innerJoin(schema.events, eq(schema.events.id, schema.competitions.eventId))
    .where(eq(schema.teamMembers.id, body.teamMemberId))
    .get()
  if (!membership) throw createError({ statusCode: 404, statusMessage: 'Participant registration not found' })

  // 2. The desk itself.
  const checkpoint = await db.select().from(schema.checkpoints).where(eq(schema.checkpoints.id, body.checkpointId)).get()
  if (!checkpoint || !checkpoint.active) {
    throw createError({ statusCode: 404, statusMessage: 'Checkpoint not found or inactive' })
  }

  // 3. A scoped volunteer may only work their own competitions' desks, and
  //    only serve participants from those competitions.
  const allowed = await allowedCompetitionIds(event, staff)
  if (allowed && checkpoint.competitionId && !allowed.includes(checkpoint.competitionId)) {
    throw createError({ statusCode: 403, statusMessage: 'This check-in point is not part of your assignment.' })
  }
  if (allowed && !allowed.includes(membership.competitionId)) {
    throw createError({
      statusCode: 403,
      statusMessage: `This QR is for ${membership.competition}, which is not a competition you are assigned to.`,
    })
  }

  // 4. Competition match. A desk dedicated to one competition must refuse a QR
  //    from another, naming both so the organiser knows what happened.
  if (checkpoint.competitionId && checkpoint.competitionId !== membership.competitionId) {
    const deskComp = await db
      .select({ name: schema.competitions.name })
      .from(schema.competitions)
      .where(eq(schema.competitions.id, checkpoint.competitionId))
      .get()
    throw createError({
      statusCode: 409,
      statusMessage: `This QR code belongs to ${membership.competition}, not ${deskComp?.name ?? 'this competition'}.`,
    })
  }

  // 5. Date/time window for the competition the QR belongs to.
  const window = competitionWindow(
    { name: membership.competition, startsAt: membership.startsAt, endsAt: membership.endsAt },
    { startDate: membership.eventStart, endDate: membership.eventEnd },
  )
  if (!window.open) {
    throw createError({ statusCode: 409, statusMessage: window.reason ?? 'This competition is not running right now.' })
  }

  // 6. Collection status. The unique (team_member_id, checkpoint_id) index is
  //    the real guard, so a double scan is a no-op rather than a second row —
  //    while the same person may still collect this item for another
  //    competition, because that is a different membership.
  const inserted = await db
    .insert(schema.checkins)
    .values({
      accountId: membership.accountId,
      teamMemberId: membership.id,
      checkpointId: body.checkpointId,
      competitionId: membership.competitionId,
      scannedBy: staff.id,
    })
    .onConflictDoNothing()
    .returning()

  // result tells the scanner UI green vs amber.
  return { result: inserted.length ? 'collected' : 'already', competition: membership.competition }
})
