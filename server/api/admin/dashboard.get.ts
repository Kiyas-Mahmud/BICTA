import { z } from 'zod'
import { and, asc, count, countDistinct, desc, eq, isNull, ne, sql } from 'drizzle-orm'
import { useDb, schema } from '../../database/client'
import { NOT_REJECTED, eventScope } from '../../utils/dashboard/scope'
import { dashboardTrendWindow, zeroFill, parsePrizeAmounts, judgeIsComplete } from '../../utils/dashboard/fold'
import { eventPhase } from '../../utils/eventPhase'
import type { DashboardPayload, TeamSplit } from '../../utils/dashboard/types'

// Everything the event dashboard needs, for ONE event, in as few round trips
// as possible.
//
// Scoping is always `innerJoin(competitions) + eq(competitions.eventId, ...)`,
// never an inArray of competition ids: D1 caps bound parameters at 100, so an
// id list is a latent ceiling, and prefetching it costs a dependent round trip.
//
// Read-only by contract. Notably this must NEVER call releaseDueDecisions() —
// that sends email, and a dashboard a moderator refreshes must not have a send
// side effect. The Application Center owns that.

const query = z.object({
  eventId: z.coerce.number().int().positive().optional(),
  days: z.coerce.number().int().min(7).max(180).default(30),
})

const emptySplit = (): TeamSplit => ({ total: 0, confirmed: 0, pending: 0, rejected: 0, active: 0 })

export default defineEventHandler(async (event): Promise<DashboardPayload> => {
  await requireAdmin(event)
  const { eventId: wanted, days } = await getValidatedQuery(event, query.parse)
  const db = useDb()

  // --- switcher + event resolution -----------------------------------------
  const events = await db
    .select({
      id: schema.events.id,
      title: schema.events.title,
      year: schema.events.year,
      status: schema.events.status,
      isCurrent: schema.events.isCurrent,
      published: schema.events.published,
      slug: schema.events.slug,
      startDate: schema.events.startDate,
      endDate: schema.events.endDate,
      venue: schema.events.venue,
    })
    .from(schema.events)
    .orderBy(desc(schema.events.year), desc(schema.events.id))

  const selected =
    events.find((e) => e.id === wanted) ?? events.find((e) => e.isCurrent) ?? events[0] ?? null

  const refs = events.map(({ slug: _s, startDate: _sd, endDate: _ed, venue: _v, ...ref }) => ref)

  // No events at all: return the shell so the UI still renders its picker and
  // empty states rather than 404-ing a page that is otherwise fine.
  if (!selected) {
    return {
      events: refs,
      event: null,
      phase: null,
      headline: {
        people: 0, participations: 0, teams: emptySplit(), institutions: 0,
        checkins: 0, checkpoints: 0, competitions: 0,
        prizePool: { value: 0, entries: 0, unparsed: 0, currencyMixed: false },
        delta: null,
      },
      funnel: { unit: 'participations', stages: [] },
      trend: { from: '', to: '', windowShifted: false, series: [] },
      competitions: [], applications: { inScope: false, totals: { expected: 0, submitted: 0, missingRequired: 0, pendingReview: 0, awaitingAnnouncement: { embargoed: 0, overdue: 0 } } },
      collection: { checkpoints: [], columns: [], cells: [], collected: 0, eligible: 0, orphanedCheckins: 0 },
      judging: [], institutions: [], teamSizes: [], recentRegistrations: [],
    }
  }

  const ev = selected.id
  const scope = eventScope(ev)
  const liveScope = and(scope, NOT_REJECTED)

  // Roster base, reused by every person-level metric.
  const roster = () =>
    db
      .select()
      .from(schema.teamMembers)
      .innerJoin(schema.registrations, eq(schema.registrations.id, schema.teamMembers.registrationId))
      .innerJoin(schema.competitions, eq(schema.competitions.id, schema.registrations.competitionId))

  // "Submitted" = a value in either column. Identical predicate to the
  // Application Center, so the two screens agree on what submitted means.
  const submittedReg = sql`EXISTS (SELECT 1 FROM application_responses ar
    WHERE ar.registration_id = ${schema.registrations.id}
      AND (ar.text_value IS NOT NULL OR ar.file_url IS NOT NULL))`
  // A competition with no form cannot have a submission; treat that as "none
  // required", or the funnel collapses to ~0 for most events.
  const compHasNoForm = sql`NOT EXISTS (SELECT 1 FROM application_fields af
    WHERE af.competition_id = ${schema.competitions.id})`
  const checkedIn = sql`EXISTS (SELECT 1 FROM checkins ci
    JOIN checkpoints cp ON cp.id = ci.checkpoint_id
    WHERE ci.team_member_id = ${schema.teamMembers.id} AND cp.event_id = ${ev})`

  const now = new Date()
  const nowIso = now.toISOString()
  const curStart = new Date(now.getTime() - (days / 2) * 86_400_000).toISOString()
  const prevStart = new Date(now.getTime() - days * 86_400_000).toISOString()
  const today = nowIso.slice(0, 10)

  // --- one batch, all independent reads ------------------------------------
  const [
    compRows, statusRows, headcountRows, totalHeadRows, funnelRows, trendRows, latestRow,
    deltaRow, cpRows, cellRows, orphanRows, prizeRows, appFieldRows,
    appStateRows, scoreRows, criteriaRows, judgeRows, instRows, sizeRows, recentRows,
  ] = await db.batch([
    // 1. competitions of the event (drives phase, split, judging)
    db.select().from(schema.competitions).where(eq(schema.competitions.eventId, ev)).orderBy(asc(schema.competitions.sortOrder)),

    // 2. teams by competition x status
    db.select({ competitionId: schema.registrations.competitionId, status: schema.registrations.status, n: count() })
      .from(schema.registrations)
      .innerJoin(schema.competitions, eq(schema.competitions.id, schema.registrations.competitionId))
      .where(scope)
      .groupBy(schema.registrations.competitionId, schema.registrations.status),

    // 3. headcount, per competition. Note `people` here is distinct WITHIN a
    //    competition — summing these would double-count anyone entered in two,
    //    which is the exact drift this refactor exists to remove. The
    //    event-level figure comes from its own global distinct (statement 3b).
    db.select({ competitionId: schema.teamMembers.competitionId, people: countDistinct(schema.teamMembers.accountId), participations: count(schema.teamMembers.id) })
      .from(schema.teamMembers)
      .innerJoin(schema.registrations, eq(schema.registrations.id, schema.teamMembers.registrationId))
      .innerJoin(schema.competitions, eq(schema.competitions.id, schema.registrations.competitionId))
      .where(liveScope)
      .groupBy(schema.teamMembers.competitionId),

    // 3b. event-level headcount — one distinct across the whole event.
    db.select({ people: countDistinct(schema.teamMembers.accountId), participations: count(schema.teamMembers.id) })
      .from(schema.teamMembers)
      .innerJoin(schema.registrations, eq(schema.registrations.id, schema.teamMembers.registrationId))
      .innerJoin(schema.competitions, eq(schema.competitions.id, schema.registrations.competitionId))
      .where(liveScope),

    // 4. funnel — one row, each stage nesting the previous predicate so the
    //    result is monotonic by construction rather than by hope.
    db.select({
      registered: count(schema.teamMembers.id),
      submitted: sql<number>`sum(case when (${submittedReg} or ${compHasNoForm}) then 1 else 0 end)`,
      confirmed: sql<number>`sum(case when (${submittedReg} or ${compHasNoForm}) and ${schema.registrations.status} = 'confirmed' then 1 else 0 end)`,
      activated: sql<number>`sum(case when (${submittedReg} or ${compHasNoForm}) and ${schema.registrations.status} = 'confirmed' and ${schema.participantAccounts.status} = 'active' then 1 else 0 end)`,
      checkedIn: sql<number>`sum(case when (${submittedReg} or ${compHasNoForm}) and ${schema.registrations.status} = 'confirmed' and ${schema.participantAccounts.status} = 'active' and ${checkedIn} then 1 else 0 end)`,
      checkedInAny: sql<number>`sum(case when ${checkedIn} then 1 else 0 end)`,
    })
      .from(schema.teamMembers)
      .innerJoin(schema.registrations, eq(schema.registrations.id, schema.teamMembers.registrationId))
      .innerJoin(schema.competitions, eq(schema.competitions.id, schema.registrations.competitionId))
      .leftJoin(schema.participantAccounts, eq(schema.participantAccounts.id, schema.teamMembers.accountId))
      .where(liveScope),

    // 5. daily registrations
    db.select({ day: sql<string>`date(${schema.registrations.createdAt})`, n: count() })
      .from(schema.registrations)
      .innerJoin(schema.competitions, eq(schema.competitions.id, schema.registrations.competitionId))
      .where(scope)
      .groupBy(sql`date(${schema.registrations.createdAt})`),

    // 6. latest registration day — lets the trend window re-anchor for past events
    db.select({ day: sql<string>`max(date(${schema.registrations.createdAt}))` })
      .from(schema.registrations)
      .innerJoin(schema.competitions, eq(schema.competitions.id, schema.registrations.competitionId))
      .where(scope),

    // 7. period-over-period delta
    db.select({
      current: sql<number>`sum(case when ${schema.registrations.createdAt} >= ${curStart} then 1 else 0 end)`,
      previous: sql<number>`sum(case when ${schema.registrations.createdAt} >= ${prevStart} and ${schema.registrations.createdAt} < ${curStart} then 1 else 0 end)`,
    })
      .from(schema.registrations)
      .innerJoin(schema.competitions, eq(schema.competitions.id, schema.registrations.competitionId))
      .where(scope),

    // 8. checkpoints of the event
    db.select({ id: schema.checkpoints.id, name: schema.checkpoints.name, competitionId: schema.checkpoints.competitionId })
      .from(schema.checkpoints)
      .where(and(eq(schema.checkpoints.eventId, ev), eq(schema.checkpoints.active, true)))
      .orderBy(asc(schema.checkpoints.sortOrder)),

    // 9. collection matrix — scoped via checkpoints.eventId (NOT NULL), never
    //    checkins.competitionId, which is nullable by backfill and set-null.
    db.select({ checkpointId: schema.checkins.checkpointId, competitionId: schema.checkins.competitionId, n: countDistinct(schema.checkins.id) })
      .from(schema.checkins)
      .innerJoin(schema.checkpoints, eq(schema.checkpoints.id, schema.checkins.checkpointId))
      .where(eq(schema.checkpoints.eventId, ev))
      .groupBy(schema.checkins.checkpointId, schema.checkins.competitionId),

    // 10. rows that escape the (team_member_id, checkpoint_id) unique guard
    db.select({ n: count() })
      .from(schema.checkins)
      .innerJoin(schema.checkpoints, eq(schema.checkpoints.id, schema.checkins.checkpointId))
      .where(and(eq(schema.checkpoints.eventId, ev), isNull(schema.checkins.teamMemberId))),

    // 11. prize amounts (free text — parsed in JS)
    db.select({ amount: schema.prizes.amount })
      .from(schema.prizes)
      .innerJoin(schema.competitions, eq(schema.competitions.id, schema.prizes.competitionId))
      .where(scope),

    // 12. which competitions define a form, and how many required fields
    db.select({ competitionId: schema.applicationFields.competitionId, total: count(), required: sql<number>`sum(case when ${schema.applicationFields.required} then 1 else 0 end)` })
      .from(schema.applicationFields)
      .innerJoin(schema.competitions, eq(schema.competitions.id, schema.applicationFields.competitionId))
      .where(scope)
      .groupBy(schema.applicationFields.competitionId),

    // 13. review state. awaitingAnnouncement is split by embargo here rather
    //     than via pendingAnnouncementCount(), which is one query per
    //     competition AND ignores the embargo despite its name.
    db.select({
      competitionId: schema.registrations.competitionId,
      submitted: sql<number>`sum(case when ${submittedReg} then 1 else 0 end)`,
      // Submitted, but at least one REQUIRED field still unanswered. Compared
      // as counts so it needs no per-row fold: required fields defined vs
      // required fields actually answered for this registration.
      missingRequired: sql<number>`sum(case when ${submittedReg} and (
        (SELECT count(*) FROM application_fields af
          WHERE af.competition_id = ${schema.registrations.competitionId} AND af.required = 1)
        >
        (SELECT count(*) FROM application_responses ar
          JOIN application_fields af2 ON af2.id = ar.field_id
          WHERE ar.registration_id = ${schema.registrations.id} AND af2.required = 1
            AND (ar.text_value IS NOT NULL OR ar.file_url IS NOT NULL))
      ) then 1 else 0 end)`,
      pendingReview: sql<number>`sum(case when ${submittedReg} and ${schema.registrations.status} = 'pending' then 1 else 0 end)`,
      embargoed: sql<number>`sum(case when ${schema.registrations.status} in ('confirmed','rejected') and ${schema.registrations.decisionNotifiedAt} is null and ${schema.competitions.resultsAnnounceAt} is not null and ${schema.competitions.resultsAnnounceAt} > ${today} then 1 else 0 end)`,
      overdue: sql<number>`sum(case when ${schema.registrations.status} in ('confirmed','rejected') and ${schema.registrations.decisionNotifiedAt} is null and (${schema.competitions.resultsAnnounceAt} is null or ${schema.competitions.resultsAnnounceAt} <= ${today}) then 1 else 0 end)`,
    })
      .from(schema.registrations)
      .innerJoin(schema.competitions, eq(schema.competitions.id, schema.registrations.competitionId))
      .where(scope)
      .groupBy(schema.registrations.competitionId),

    // 14. judging — one grouped read, not getLeaderboard() per competition
    db.select({ competitionId: schema.scores.competitionId, registrationId: schema.scores.registrationId, judgeId: schema.scores.judgeId, n: count() })
      .from(schema.scores)
      .innerJoin(schema.competitions, eq(schema.competitions.id, schema.scores.competitionId))
      .where(scope)
      .groupBy(schema.scores.competitionId, schema.scores.registrationId, schema.scores.judgeId),

    // 15. criteria (competitionId null = event-wide, applies to every one)
    db.select({ id: schema.judgingCriteria.id, competitionId: schema.judgingCriteria.competitionId })
      .from(schema.judgingCriteria)
      .where(eq(schema.judgingCriteria.eventId, ev)),

    // 16. active assigned judges per competition
    db.select({ competitionId: schema.judgeAssignments.competitionId, n: countDistinct(schema.judgeAccounts.id) })
      .from(schema.judgeAssignments)
      .innerJoin(schema.competitions, eq(schema.competitions.id, schema.judgeAssignments.competitionId))
      .innerJoin(schema.judgeAccounts, eq(schema.judgeAccounts.personId, schema.judgeAssignments.personId))
      .where(and(scope, eq(schema.judgeAccounts.status, 'active')))
      .groupBy(schema.judgeAssignments.competitionId),

    // 17. institutions. Grouped case/whitespace-insensitively so "BUET",
    //     "buet" and "BUET " are one row, but displayed using an actual
    //     original spelling rather than the lowercased grouping key.
    db.select({ name: sql<string>`min(trim(${schema.registrations.institution}))`, teams: count(), people: countDistinct(schema.teamMembers.accountId) })
      .from(schema.registrations)
      .innerJoin(schema.competitions, eq(schema.competitions.id, schema.registrations.competitionId))
      .leftJoin(schema.teamMembers, eq(schema.teamMembers.registrationId, schema.registrations.id))
      .where(and(liveScope, ne(schema.registrations.institution, '')))
      .groupBy(sql`lower(trim(${schema.registrations.institution}))`)
      .orderBy(desc(count()))
      .limit(10),

    // 18. team sizes — per registration, bucketed in JS
    db.select({ registrationId: schema.teamMembers.registrationId, n: count() })
      .from(schema.teamMembers)
      .innerJoin(schema.registrations, eq(schema.registrations.id, schema.teamMembers.registrationId))
      .innerJoin(schema.competitions, eq(schema.competitions.id, schema.registrations.competitionId))
      .where(liveScope)
      .groupBy(schema.teamMembers.registrationId),

    // 19. recent registrations — the honest event-scoped activity feed
    db.select({
      id: schema.registrations.id, fullName: schema.registrations.fullName,
      teamName: schema.registrations.teamName, status: schema.registrations.status,
      competitionName: schema.competitions.name, createdAt: schema.registrations.createdAt,
    })
      .from(schema.registrations)
      .innerJoin(schema.competitions, eq(schema.competitions.id, schema.registrations.competitionId))
      .where(scope)
      .orderBy(desc(schema.registrations.createdAt))
      .limit(8),
  ])

  // --- fold ----------------------------------------------------------------
  const splitFor = (rows: { status: string; n: number }[]): TeamSplit => {
    const s = emptySplit()
    for (const r of rows) {
      s.total += r.n
      if (r.status === 'confirmed') s.confirmed += r.n
      else if (r.status === 'pending') s.pending += r.n
      else if (r.status === 'rejected') s.rejected += r.n
    }
    s.active = s.total - s.rejected
    return s
  }

  const statusByComp = new Map<number, { status: string; n: number }[]>()
  for (const r of statusRows) {
    statusByComp.set(r.competitionId, [...(statusByComp.get(r.competitionId) ?? []), r])
  }
  const headByComp = new Map(headcountRows.map((r) => [r.competitionId, r]))
  const appFieldsByComp = new Map(appFieldRows.map((r) => [r.competitionId, r]))
  const appStateByComp = new Map(appStateRows.map((r) => [r.competitionId, r]))
  const judgesByComp = new Map(judgeRows.map((r) => [r.competitionId, r.n]))

  const totalTeams = splitFor(statusRows)
  // From the global distinct, never a sum of the per-competition counts.
  const people = totalHeadRows[0]?.people ?? 0
  const participations = totalHeadRows[0]?.participations ?? 0

  const f = funnelRows[0]
  const funnelStages: DashboardPayload['funnel']['stages'] = [
    { key: 'registered', label: 'Registered', value: Number(f?.registered ?? 0) },
    { key: 'submitted', label: 'Application in', value: Number(f?.submitted ?? 0) },
    { key: 'confirmed', label: 'Selected', value: Number(f?.confirmed ?? 0) },
    { key: 'activated', label: 'Account active', value: Number(f?.activated ?? 0) },
    {
      key: 'checked-in',
      label: 'Checked in',
      value: Number(f?.checkedIn ?? 0),
      // Check-in never consults registration status, so people whose entry is
      // still pending really do walk through the door. Surface that gap rather
      // than let the last bar quietly undercount.
      meta: { anyStatus: Number(f?.checkedInAny ?? 0) },
    },
  ]

  const window = dashboardTrendWindow(selected, days, latestRow[0]?.day ?? null, now)
  const trendSeries = zeroFill(trendRows.map((r) => ({ day: r.day, n: r.n })), window.from, window.to)

  const phase = eventPhase(
    selected,
    compRows,
    {
      pendingReview: appStateRows.reduce((a, r) => a + Number(r.pendingReview ?? 0), 0),
      awaitingAnnouncement: appStateRows.reduce((a, r) => a + Number(r.embargoed ?? 0) + Number(r.overdue ?? 0), 0),
      anyScores: scoreRows.length > 0,
    },
    now,
  )

  // Criteria that apply to a competition = its own + the event-wide ones.
  const eventWideCriteria = criteriaRows.filter((c) => c.competitionId === null).length
  const criteriaByComp = new Map<number, number>()
  for (const c of criteriaRows) {
    if (c.competitionId !== null) criteriaByComp.set(c.competitionId, (criteriaByComp.get(c.competitionId) ?? 0) + 1)
  }
  const criteriaFor = (id: number) => (criteriaByComp.get(id) ?? 0) + eventWideCriteria

  // A team counts as scored once at least one judge has completed every
  // criterion for it — the same rule the leaderboard applies.
  const scoredTeams = new Map<number, Set<number>>()
  for (const s of scoreRows) {
    if (!judgeIsComplete(s.n, criteriaFor(s.competitionId))) continue
    const set = scoredTeams.get(s.competitionId) ?? new Set<number>()
    set.add(s.registrationId)
    scoredTeams.set(s.competitionId, set)
  }

  const competitions: DashboardPayload['competitions'] = compRows.map((c) => {
    const teams = splitFor(statusByComp.get(c.id) ?? [])
    const head = headByComp.get(c.id)
    const seats = teams.active * c.maxTeamSize
    const p = phase.competitions.find((x) => x.id === c.id)
    return {
      id: c.id,
      name: c.name,
      teamBased: c.teamBased,
      maxTeamSize: c.maxTeamSize,
      teams,
      participations: head?.participations ?? 0,
      // Real capacity is not derivable — maxTeamSize caps a team's headcount,
      // not the number of teams. This answers "are teams arriving full?".
      rosterFullness: c.teamBased && seats > 0 ? Math.min(1, (head?.participations ?? 0) / seats) : null,
      registration: p?.registration ?? 'closed',
      application: p?.application ?? 'closed',
      window: p?.window ?? 'unscheduled',
      judgingOpen: c.judgingOpen,
    }
  })

  // Collection: eligible per column uses participations (the QR is per
  // membership), and counts non-rejected — which is what check-in permits.
  const eventWideEligible = participations
  const columns: DashboardPayload['collection']['columns'] = [
    ...compRows.map((c) => ({ id: c.id as number | null, name: c.name, eligible: headByComp.get(c.id)?.participations ?? 0 })),
  ]
  if (cellRows.some((r) => r.competitionId === null)) {
    columns.push({ id: null, name: 'Event-wide', eligible: eventWideEligible })
  }

  const checkinsTotal = cellRows.reduce((a, r) => a + r.n, 0)
  const collectionEligible = cpRows.reduce((total, cp) => {
    return total + (cp.competitionId === null ? eventWideEligible : headByComp.get(cp.competitionId)?.participations ?? 0)
  }, 0)

  const appInScope = appFieldRows.length > 0
  const expected = appInScope
    ? compRows.filter((c) => appFieldsByComp.has(c.id)).reduce((a, c) => a + splitFor(statusByComp.get(c.id) ?? []).active, 0)
    : 0

  const sizeBuckets = new Map<number, number>()
  for (const r of sizeRows) sizeBuckets.set(r.n, (sizeBuckets.get(r.n) ?? 0) + 1)

  const isFinished = selected.status === 'past'
  const d = deltaRow[0]

  return {
    events: refs,
    event: {
      id: selected.id, title: selected.title, year: selected.year, status: selected.status,
      isCurrent: selected.isCurrent, published: selected.published, slug: selected.slug,
      startDate: selected.startDate, endDate: selected.endDate, venue: selected.venue,
    },
    phase,
    headline: {
      people,
      participations,
      teams: totalTeams,
      institutions: instRows.length,
      checkins: checkinsTotal,
      checkpoints: cpRows.length,
      competitions: compRows.length,
      prizePool: parsePrizeAmounts(prizeRows.map((p) => p.amount)),
      // A "-100% week over week" badge on an event that ended in 2024 is noise.
      delta: isFinished ? null : { registrations: { current: Number(d?.current ?? 0), previous: Number(d?.previous ?? 0), days: Math.round(days / 2) } },
    },
    funnel: { unit: 'participations', stages: funnelStages },
    trend: {
      from: window.from.toISOString().slice(0, 10),
      to: window.to.toISOString().slice(0, 10),
      windowShifted: window.windowShifted,
      series: trendSeries,
    },
    competitions,
    applications: {
      inScope: appInScope,
      totals: {
        expected,
        submitted: appStateRows.reduce((a, r) => a + Number(r.submitted ?? 0), 0),
        missingRequired: appStateRows.reduce((a, r) => a + Number(r.missingRequired ?? 0), 0),
        pendingReview: appStateRows.reduce((a, r) => a + Number(r.pendingReview ?? 0), 0),
        awaitingAnnouncement: {
          embargoed: appStateRows.reduce((a, r) => a + Number(r.embargoed ?? 0), 0),
          overdue: appStateRows.reduce((a, r) => a + Number(r.overdue ?? 0), 0),
        },
      },
    },
    collection: {
      checkpoints: cpRows,
      columns,
      cells: cellRows.map((r) => ({ checkpointId: r.checkpointId, competitionId: r.competitionId, collected: r.n })),
      collected: checkinsTotal,
      eligible: collectionEligible,
      orphanedCheckins: orphanRows[0]?.n ?? 0,
    },
    judging: compRows.map((c) => ({
      competitionId: c.id,
      name: c.name,
      teamsTotal: splitFor(statusByComp.get(c.id) ?? []).confirmed,
      teamsScored: scoredTeams.get(c.id)?.size ?? 0,
      judgesTotal: judgesByComp.get(c.id) ?? 0,
      criteriaCount: criteriaFor(c.id),
      judgingOpen: c.judgingOpen,
    })),
    institutions: instRows.map((r) => ({ name: r.name, teams: r.teams, people: r.people })),
    teamSizes: [...sizeBuckets.entries()].sort((a, b) => a[0] - b[0]).map(([size, teams]) => ({ size, teams })),
    recentRegistrations: recentRows,
  }
})
