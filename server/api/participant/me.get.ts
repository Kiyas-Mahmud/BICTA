import { eq, and, inArray } from 'drizzle-orm'
import { useDb, schema } from '../../database/client'
import { qrDataUrl } from '../../utils/qr'

// Everything the participant dashboard needs in one payload.
export default defineEventHandler(async (event) => {
  const me = await requireParticipant(event)
  const db = useDb()

  const account = db.select().from(schema.participantAccounts).where(eq(schema.participantAccounts.id, me.id)).get()
  if (!account) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  // Teams I belong to.
  const memberships = await db
    .select()
    .from(schema.teamMembers)
    .where(eq(schema.teamMembers.accountId, account.id))

  const teams = []
  for (const membership of memberships) {
    const registration = db
      .select()
      .from(schema.registrations)
      .where(eq(schema.registrations.id, membership.registrationId))
      .get()
    if (!registration) continue

    const comp = db.select().from(schema.competitions).where(eq(schema.competitions.id, registration.competitionId)).get()
    const ev = comp ? db.select().from(schema.events).where(eq(schema.events.id, comp.eventId)).get() : null

    const roster = await db
      .select({
        memberId: schema.teamMembers.id,
        role: schema.teamMembers.role,
        fullName: schema.participantAccounts.fullName,
        email: schema.participantAccounts.email,
        status: schema.participantAccounts.status,
      })
      .from(schema.teamMembers)
      .innerJoin(schema.participantAccounts, eq(schema.participantAccounts.id, schema.teamMembers.accountId))
      .where(eq(schema.teamMembers.registrationId, registration.id))

    const deadlinePassed = comp?.registrationDeadline
      ? new Date(`${comp.registrationDeadline}T23:59:59Z`) < new Date()
      : false

    teams.push({
      registrationId: registration.id,
      teamName: registration.teamName,
      status: registration.status,
      myRole: membership.role,
      // Leader may edit the roster until the registration deadline.
      canManage: membership.role === 'leader' && !deadlinePassed,
      competition: comp
        ? {
            id: comp.id,
            name: comp.name,
            type: comp.type,
            teamBased: comp.teamBased,
            maxTeamSize: comp.maxTeamSize,
            registrationDeadline: comp.registrationDeadline,
          }
        : null,
      event: ev ? { title: ev.title, startDate: ev.startDate, endDate: ev.endDate, venue: ev.venue } : null,
      roster,
    })
  }

  // Collection checklist for the current event.
  const currentEvent = db.select().from(schema.events).where(eq(schema.events.isCurrent, true)).get()
  const activeCheckpoints = currentEvent
    ? await db
        .select()
        .from(schema.checkpoints)
        .where(and(eq(schema.checkpoints.eventId, currentEvent.id), eq(schema.checkpoints.active, true)))
        .orderBy(schema.checkpoints.sortOrder)
    : []
  const myCheckins = activeCheckpoints.length
    ? await db
        .select()
        .from(schema.checkins)
        .where(
          and(
            eq(schema.checkins.accountId, account.id),
            inArray(schema.checkins.checkpointId, activeCheckpoints.map((c) => c.id)),
          ),
        )
    : []

  return {
    account: { fullName: account.fullName, email: account.email, phone: account.phone },
    qr: await qrDataUrl(account.checkinToken),
    teams,
    collection: activeCheckpoints.map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      collected: myCheckins.some((ci) => ci.checkpointId === c.id),
      collectedAt: myCheckins.find((ci) => ci.checkpointId === c.id)?.collectedAt ?? null,
    })),
  }
})
