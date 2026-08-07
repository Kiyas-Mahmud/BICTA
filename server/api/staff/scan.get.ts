import { and, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { useDb, schema } from '../../database/client'
import { allowedCompetitionIds } from '../../utils/volunteerScope'
import { competitionWindow } from '../../utils/competitionWindow'

const querySchema = z.object({ token: z.string().trim().min(10).max(200) })

// Resolve a scanned QR to ONE participation — a person in one competition —
// plus that participation's own collection state.
//
// The token lives on team_members, so a person entered in two competitions has
// two different QRs and the scanner always knows which registration is in
// front of it. Legacy account-level tokens still resolve (see below) so codes
// emailed before this change keep working.
export default defineEventHandler(async (event) => {
  const staff = await requireStaff(event)
  const q = await getValidatedQuery(event, querySchema.parse)
  const db = useDb()

  const membership = await db
    .select({
      teamMemberId: schema.teamMembers.id,
      role: schema.teamMembers.role,
      accountId: schema.participantAccounts.id,
      fullName: schema.participantAccounts.fullName,
      email: schema.participantAccounts.email,
      teamName: schema.registrations.teamName,
      regStatus: schema.registrations.status,
      competitionId: schema.competitions.id,
      competition: schema.competitions.name,
      startsAt: schema.competitions.startsAt,
      endsAt: schema.competitions.endsAt,
      eventStart: schema.events.startDate,
      eventEnd: schema.events.endDate,
    })
    .from(schema.teamMembers)
    .innerJoin(schema.participantAccounts, eq(schema.participantAccounts.id, schema.teamMembers.accountId))
    .innerJoin(schema.registrations, eq(schema.registrations.id, schema.teamMembers.registrationId))
    .innerJoin(schema.competitions, eq(schema.competitions.id, schema.teamMembers.competitionId))
    .innerJoin(schema.events, eq(schema.events.id, schema.competitions.eventId))
    .where(eq(schema.teamMembers.checkinToken, q.token))
    .get()

  if (!membership) {
    // A pre-migration QR identifies the person but not which competition. It
    // cannot be honoured safely now that collection is per competition, so say
    // exactly that instead of guessing a registration.
    const legacy = await db
      .select({ fullName: schema.participantAccounts.fullName })
      .from(schema.participantAccounts)
      .where(eq(schema.participantAccounts.checkinToken, q.token))
      .get()
    throw createError({
      statusCode: legacy ? 409 : 404,
      statusMessage: legacy
        ? `${legacy.fullName} is showing an old QR that is not tied to a competition. Ask them to reopen their dashboard and show the QR for this competition.`
        : 'Unknown QR code',
    })
  }

  const allowed = await allowedCompetitionIds(event, staff)
  if (allowed && !allowed.includes(membership.competitionId)) {
    throw createError({
      statusCode: 403,
      statusMessage: `This QR is for ${membership.competition}, which is not a competition you are assigned to.`,
    })
  }

  const window = competitionWindow(
    { name: membership.competition, startsAt: membership.startsAt, endsAt: membership.endsAt },
    { startDate: membership.eventStart, endDate: membership.eventEnd },
  )

  // Scoped to this membership, so the desk sees what THIS registration has
  // collected — not what the person collected under another competition.
  const collected = await db
    .select({ checkpointId: schema.checkins.checkpointId, collectedAt: schema.checkins.collectedAt })
    .from(schema.checkins)
    .where(eq(schema.checkins.teamMemberId, membership.teamMemberId))

  return {
    account: { id: membership.accountId, fullName: membership.fullName, email: membership.email },
    participation: {
      teamMemberId: membership.teamMemberId,
      competitionId: membership.competitionId,
      competition: membership.competition,
      teamName: membership.teamName,
      role: membership.role,
      regStatus: membership.regStatus,
    },
    window,
    collected,
  }
})
