import { eq, and, inArray } from 'drizzle-orm'
import { useDb, schema } from '../../database/client'
import { qrDataUrl } from '../../utils/qr'
import { siteUrl } from '../../utils/email'
import { competitionWindow } from '../../utils/competitionWindow'

// Everything the participant dashboard needs in one payload.
export default defineEventHandler(async (event) => {
  const me = await requireParticipant(event)
  const db = useDb()

  const account = await db.select().from(schema.participantAccounts).where(eq(schema.participantAccounts.id, me.id)).get()
  if (!account) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  // Teams I belong to.
  const memberships = await db
    .select()
    .from(schema.teamMembers)
    .where(eq(schema.teamMembers.accountId, account.id))

  const teams = []
  for (const membership of memberships) {
    const registration = await db
      .select()
      .from(schema.registrations)
      .where(eq(schema.registrations.id, membership.registrationId))
      .get()
    if (!registration) continue

    const comp = await db.select().from(schema.competitions).where(eq(schema.competitions.id, registration.competitionId)).get()
    const ev = comp ? await db.select().from(schema.events).where(eq(schema.events.id, comp.eventId)).get() : null

    const rosterRows = await db
      .select({
        accountId: schema.participantAccounts.id,
        memberId: schema.teamMembers.id,
        role: schema.teamMembers.role,
        fullName: schema.participantAccounts.fullName,
        email: schema.participantAccounts.email,
        status: schema.participantAccounts.status,
        inviteToken: schema.participantAccounts.inviteToken,
        inviteExpires: schema.participantAccounts.inviteExpires,
      })
      .from(schema.teamMembers)
      .innerJoin(schema.participantAccounts, eq(schema.participantAccounts.id, schema.teamMembers.accountId))
      .where(eq(schema.teamMembers.registrationId, registration.id))

    const deadlinePassed = comp?.registrationDeadline
      ? new Date(`${comp.registrationDeadline}T23:59:59Z`) < new Date()
      : false

    // The leader of this team gets each pending teammate's set-password link so
    // they can pass it on directly (email delivery is not guaranteed). Scoped
    // deliberately: leaders only, still-invited members only, and the raw token
    // never leaves this branch.
    //
    // An expired invite is reported as such rather than silently rotated: the
    // seat it held is released once anyone tries to use that address again, so
    // quietly reviving the link here would keep the address locked forever.
    // Re-inviting is an explicit action (remove the teammate, add them back).
    const isLeader = membership.role === 'leader'
    const roster = []
    for (const { accountId: _accountId, inviteToken, inviteExpires, ...m } of rosterRows) {
      const expired = m.status !== 'active' && Boolean(inviteExpires) && new Date(inviteExpires!) < new Date()
      const link = isLeader && m.status === 'invited' && inviteToken && !expired
        ? siteUrl(`/portal/set-password?token=${inviteToken}`)
        : null
      roster.push({ ...m, inviteLink: link, inviteExpired: expired })
    }

    // This competition's own desks: the ones scoped to it, plus the
    // event-wide ones. A kit desk belonging to another competition must not
    // appear on this tab.
    const checkpoints = comp
      ? await db
          .select()
          .from(schema.checkpoints)
          .where(and(eq(schema.checkpoints.eventId, comp.eventId), eq(schema.checkpoints.active, true)))
          .orderBy(schema.checkpoints.sortOrder)
      : []
    const myCheckpoints = checkpoints.filter((c) => c.competitionId === null || c.competitionId === comp!.id)

    // Scoped to this membership, so collecting under one competition leaves
    // the other competition's list untouched.
    const myCheckins = myCheckpoints.length
      ? await db
          .select()
          .from(schema.checkins)
          .where(
            and(
              eq(schema.checkins.teamMemberId, membership.id),
              inArray(schema.checkins.checkpointId, myCheckpoints.map((c) => c.id)),
            ),
          )
      : []

    const window = comp ? competitionWindow(comp, ev) : null

    teams.push({
      registrationId: registration.id,
      teamMemberId: membership.id,
      teamName: registration.teamName,
      status: registration.status,
      decisionNote: registration.decisionNote,
      decisionAt: registration.decisionAt,
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
            startsAt: comp.startsAt,
            endsAt: comp.endsAt,
          }
        : null,
      event: ev ? { title: ev.title, startDate: ev.startDate, endDate: ev.endDate, venue: ev.venue } : null,
      // One QR per participation. Falls back to the account-level token only
      // for rows that predate the per-membership column.
      qr: await qrDataUrl(membership.checkinToken ?? account.checkinToken),
      window,
      roster,
      collection: myCheckpoints.map((c) => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        collected: myCheckins.some((ci) => ci.checkpointId === c.id),
        collectedAt: myCheckins.find((ci) => ci.checkpointId === c.id)?.collectedAt ?? null,
      })),
    })
  }

  return {
    account: { fullName: account.fullName, email: account.email, phone: account.phone },
    teams,
  }
})
