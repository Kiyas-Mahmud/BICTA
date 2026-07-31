import { eq, desc, asc, and, or, isNull, inArray, count, countDistinct, ne } from 'drizzle-orm'
import { useDb, schema } from '../database/client'

export async function getCurrentEventFull() {
  const db = useDb()
  const event = await db.select().from(schema.events).where(eq(schema.events.isCurrent, true)).get()
  if (!event) return null

  const competitions = await db
    .select()
    .from(schema.competitions)
    .where(eq(schema.competitions.eventId, event.id))
    .orderBy(asc(schema.competitions.sortOrder))

  const prizes = competitions.length
    ? await db
        .select()
        .from(schema.prizes)
        .where(inArray(schema.prizes.competitionId, competitions.map((c) => c.id)))
        .orderBy(asc(schema.prizes.sortOrder))
    : []

  return {
    ...event,
    competitions: competitions.map((c) => ({
      ...c,
      prizes: prizes.filter((p) => p.competitionId === c.id),
    })),
  }
}

export async function getCompetitionBySlug(slug: string) {
  const db = useDb()
  const comp = await db.select().from(schema.competitions).where(eq(schema.competitions.slug, slug)).get()
  if (!comp) return null
  const event = await db.select().from(schema.events).where(eq(schema.events.id, comp.eventId)).get()
  const prizes = await db
    .select()
    .from(schema.prizes)
    .where(eq(schema.prizes.competitionId, comp.id))
    .orderBy(asc(schema.prizes.sortOrder))
  return { ...comp, event, prizes }
}

export async function getPublishedNews(limit?: number) {
  const db = useDb()
  const q = db
    .select({
      id: schema.news.id,
      title: schema.news.title,
      slug: schema.news.slug,
      excerpt: schema.news.excerpt,
      coverImage: schema.news.coverImage,
      publishedAt: schema.news.publishedAt,
    })
    .from(schema.news)
    .where(eq(schema.news.status, 'published'))
    .orderBy(desc(schema.news.publishedAt))
  return limit ? q.limit(limit) : q
}

export async function getPublishedNewsBySlug(slug: string) {
  const row = await useDb()
    .select()
    .from(schema.news)
    .where(and(eq(schema.news.slug, slug), eq(schema.news.status, 'published')))
    .get()
  return row ?? null
}

export async function getSettings(): Promise<Record<string, string>> {
  const rows = await useDb().select().from(schema.siteSettings)
  return Object.fromEntries(rows.map((r) => [r.key, r.value]))
}

// ---- Home page sections ----

export function getHomeFeatures() {
  return useDb().select().from(schema.homeFeatures).orderBy(asc(schema.homeFeatures.sortOrder)).all()
}

export function getTimeline(eventId: number) {
  return useDb()
    .select()
    .from(schema.timelineMilestones)
    .where(eq(schema.timelineMilestones.eventId, eventId))
    .orderBy(asc(schema.timelineMilestones.sortOrder))
    .all()
}

/**
 * Active sponsors for one event, plus the house sponsors (null eventId) that
 * appear on every edition.
 */
export function getSponsors(eventId?: number) {
  return useDb()
    .select()
    .from(schema.sponsors)
    .where(
      and(
        eq(schema.sponsors.active, true),
        eventId ? or(isNull(schema.sponsors.eventId), eq(schema.sponsors.eventId, eventId)) : undefined,
      ),
    )
    .orderBy(asc(schema.sponsors.sortOrder))
    .all()
}

export function getPeople() {
  return useDb().select().from(schema.people).orderBy(asc(schema.people.sortOrder)).all()
}

export function getWinners() {
  return useDb().select().from(schema.winners).orderBy(asc(schema.winners.sortOrder)).all()
}

/**
 * Site-wide questions only — the ones with no event and no competition. Event
 * and competition pages ask for their own scope instead.
 */
export function getFaqs() {
  return useDb()
    .select()
    .from(schema.faqs)
    .where(and(isNull(schema.faqs.eventId), isNull(schema.faqs.competitionId)))
    .orderBy(asc(schema.faqs.sortOrder))
    .all()
}

/** Questions attached to one event, excluding any narrowed to a competition. */
export function getEventFaqs(eventId: number) {
  return useDb()
    .select()
    .from(schema.faqs)
    .where(and(eq(schema.faqs.eventId, eventId), isNull(schema.faqs.competitionId)))
    .orderBy(asc(schema.faqs.sortOrder))
    .all()
}

export function getCompetitionFaqs(competitionId: number) {
  return useDb()
    .select()
    .from(schema.faqs)
    .where(eq(schema.faqs.competitionId, competitionId))
    .orderBy(asc(schema.faqs.sortOrder))
    .all()
}

/** Published notices for an event, pinned first then newest. */
export function getAnnouncements(eventId: number) {
  return useDb()
    .select()
    .from(schema.announcements)
    .where(and(eq(schema.announcements.eventId, eventId), eq(schema.announcements.published, true)))
    .orderBy(desc(schema.announcements.pinned), desc(schema.announcements.createdAt))
    .all()
}

/** Judges assigned to the competitions inside one event, with their assignments. */
export async function getEventJudges(eventId: number) {
  const db = useDb()
  const rows = await db
    .select({
      id: schema.people.id,
      name: schema.people.name,
      title: schema.people.title,
      organization: schema.people.organization,
      photoUrl: schema.people.photoUrl,
      bio: schema.people.bio,
      socialUrl: schema.people.socialUrl,
      expertise: schema.people.expertise,
      sortOrder: schema.people.sortOrder,
      competitionId: schema.competitions.id,
      competitionName: schema.competitions.name,
    })
    .from(schema.judgeAssignments)
    .innerJoin(schema.people, eq(schema.people.id, schema.judgeAssignments.personId))
    .innerJoin(schema.competitions, eq(schema.competitions.id, schema.judgeAssignments.competitionId))
    .where(eq(schema.competitions.eventId, eventId))
    .orderBy(asc(schema.people.sortOrder))

  // One card per person, listing every competition they judge.
  const byPerson = new Map<number, { id: number; name: string; title: string; organization: string; photoUrl: string | null; bio: string; socialUrl: string | null; expertise: string; competitions: string[] }>()
  for (const r of rows) {
    const existing = byPerson.get(r.id)
    if (existing) {
      existing.competitions.push(r.competitionName)
      continue
    }
    byPerson.set(r.id, {
      id: r.id,
      name: r.name,
      title: r.title,
      organization: r.organization,
      photoUrl: r.photoUrl,
      bio: r.bio,
      socialUrl: r.socialUrl,
      expertise: r.expertise,
      competitions: [r.competitionName],
    })
  }
  return [...byPerson.values()]
}

/** Judges for a single competition. */
export function getCompetitionJudges(competitionId: number) {
  return useDb()
    .select({
      id: schema.people.id,
      name: schema.people.name,
      title: schema.people.title,
      organization: schema.people.organization,
      photoUrl: schema.people.photoUrl,
      bio: schema.people.bio,
      socialUrl: schema.people.socialUrl,
      expertise: schema.people.expertise,
    })
    .from(schema.judgeAssignments)
    .innerJoin(schema.people, eq(schema.people.id, schema.judgeAssignments.personId))
    .where(eq(schema.judgeAssignments.competitionId, competitionId))
    .orderBy(asc(schema.people.sortOrder))
    .all()
}

export function getHowItWorksSteps() {
  return useDb().select().from(schema.howItWorksSteps).orderBy(asc(schema.howItWorksSteps.sortOrder)).all()
}

export function getEventGallery(eventId: number) {
  return useDb()
    .select()
    .from(schema.galleryImages)
    .where(eq(schema.galleryImages.eventId, eventId))
    .orderBy(asc(schema.galleryImages.sortOrder))
    .all()
}

// ---- Organisation-level numbers for the home page ----

/**
 * Real counts pulled from the database. Anything that has no table behind it
 * (submitted projects, prize money) comes from site settings instead — see the
 * Impact group in admin settings.
 */
export async function getOrgStats() {
  const db = useDb()
  const [editions, competitions, participants, universities, sponsors, judges, volunteers] = await db.batch([
    db.select({ n: count() }).from(schema.events),
    db.select({ n: count() }).from(schema.competitions),
    db.select({ n: count() }).from(schema.participantAccounts),
    db
      .select({ n: countDistinct(schema.registrations.institution) })
      .from(schema.registrations)
      .where(ne(schema.registrations.institution, '')),
    db.select({ n: count() }).from(schema.sponsors).where(eq(schema.sponsors.active, true)),
    db.select({ n: count() }).from(schema.people).where(eq(schema.people.role, 'judge')),
    db.select({ n: count() }).from(schema.admins).where(eq(schema.admins.role, 'volunteer')),
  ])

  return {
    editions: editions[0]?.n ?? 0,
    competitions: competitions[0]?.n ?? 0,
    participants: participants[0]?.n ?? 0,
    universities: universities[0]?.n ?? 0,
    sponsors: sponsors[0]?.n ?? 0,
    judges: judges[0]?.n ?? 0,
    volunteers: volunteers[0]?.n ?? 0,
  }
}

/** Registered team count per competition, for the directory cards. */
export async function getCompetitionCounts(competitionIds: number[]) {
  if (!competitionIds.length) return {} as Record<number, number>
  const rows = await useDb()
    .select({ competitionId: schema.registrations.competitionId, n: count() })
    .from(schema.registrations)
    .where(inArray(schema.registrations.competitionId, competitionIds))
    .groupBy(schema.registrations.competitionId)
  return Object.fromEntries(rows.map((r) => [r.competitionId, r.n])) as Record<number, number>
}

// ---- Event listings ----

/** Every event with its competitions, newest edition first. */
export async function getEventsWithCompetitions() {
  const db = useDb()
  const events = await db.select().from(schema.events).orderBy(desc(schema.events.year), desc(schema.events.id))
  if (!events.length) return []

  const comps = await db
    .select()
    .from(schema.competitions)
    .where(inArray(schema.competitions.eventId, events.map((e) => e.id)))
    .orderBy(asc(schema.competitions.sortOrder))

  const counts = await getCompetitionCounts(comps.map((c) => c.id))

  return events.map((e) => ({
    ...e,
    competitions: comps
      .filter((c) => c.eventId === e.id)
      .map((c) => ({ ...c, registeredTeams: counts[c.id] ?? 0 })),
  }))
}

/**
 * The full payload behind /events/[slug]. Accepts a slug or (for legacy links)
 * a numeric id. Unpublished events resolve only when includeDrafts is set —
 * the public route never sets it, so drafts 404 there.
 */
export async function getEventDetail(slugOrId: string, opts: { includeDrafts?: boolean } = {}) {
  const db = useDb()
  const byId = /^\d+$/.test(slugOrId)
  const event = await db
    .select()
    .from(schema.events)
    .where(byId ? eq(schema.events.id, Number(slugOrId)) : eq(schema.events.slug, slugOrId))
    .get()
  if (!event) return null
  if (!event.published && !opts.includeDrafts) return null

  const competitions = await db
    .select()
    .from(schema.competitions)
    .where(eq(schema.competitions.eventId, event.id))
    .orderBy(asc(schema.competitions.sortOrder))

  const compIds = competitions.map((c) => c.id)
  const [prizes, counts, timeline, gallery, sponsors, judges, faqs, announcements, eventPrizes, schedule, criteria, participants] =
    await Promise.all([
      compIds.length
        ? db.select().from(schema.prizes).where(inArray(schema.prizes.competitionId, compIds)).orderBy(asc(schema.prizes.sortOrder))
        : Promise.resolve([]),
      getCompetitionCounts(compIds),
      getTimeline(event.id),
      getEventGallery(event.id),
      getSponsors(event.id),
      getEventJudges(event.id),
      getEventFaqs(event.id),
      getAnnouncements(event.id),
      db
        .select()
        .from(schema.eventPrizes)
        .where(and(eq(schema.eventPrizes.eventId, event.id), eq(schema.eventPrizes.published, true)))
        .orderBy(asc(schema.eventPrizes.sortOrder)),
      db
        .select()
        .from(schema.scheduleItems)
        .where(and(eq(schema.scheduleItems.eventId, event.id), eq(schema.scheduleItems.published, true)))
        .orderBy(asc(schema.scheduleItems.date), asc(schema.scheduleItems.startTime), asc(schema.scheduleItems.sortOrder)),
      db
        .select()
        .from(schema.judgingCriteria)
        .where(and(eq(schema.judgingCriteria.eventId, event.id), eq(schema.judgingCriteria.published, true)))
        .orderBy(asc(schema.judgingCriteria.sortOrder)),
      // Distinct people on this edition's rosters, for the hero counter.
      compIds.length
        ? db
            .select({ n: countDistinct(schema.teamMembers.accountId) })
            .from(schema.teamMembers)
            .where(inArray(schema.teamMembers.competitionId, compIds))
        : Promise.resolve([{ n: 0 }]),
    ])

  const totalTeams = Object.values(counts).reduce((a, b) => a + b, 0)

  return {
    ...event,
    competitions: competitions.map((c) => ({
      ...c,
      prizes: prizes.filter((p) => p.competitionId === c.id),
      registeredTeams: counts[c.id] ?? 0,
      criteria: criteria.filter((k) => k.competitionId === c.id),
    })),
    timeline,
    gallery,
    sponsors,
    judges,
    faqs,
    announcements,
    eventPrizes,
    schedule,
    // Event-wide criteria only; segment criteria travel on each competition.
    criteria: criteria.filter((k) => k.competitionId === null),
    stats: { participants: participants[0]?.n ?? 0, teams: totalTeams },
  }
}

/**
 * The full payload behind /events/[slug]/[compSlug]. Both segments accept a
 * slug or a legacy numeric id; a competition under an unpublished event stays
 * hidden with the event.
 */
export async function getCompetitionDetail(slugOrId: string, opts: { includeDrafts?: boolean } = {}) {
  const db = useDb()
  const byId = /^\d+$/.test(slugOrId)
  const comp = await db
    .select()
    .from(schema.competitions)
    .where(byId ? eq(schema.competitions.id, Number(slugOrId)) : eq(schema.competitions.slug, slugOrId))
    .get()
  if (!comp) return null

  const event = await db.select().from(schema.events).where(eq(schema.events.id, comp.eventId)).get()
  if (!event || (!event.published && !opts.includeDrafts)) return null

  const [prizes, judges, faqs, counts, timeline, criteria, schedule] = await Promise.all([
    db.select().from(schema.prizes).where(eq(schema.prizes.competitionId, comp.id)).orderBy(asc(schema.prizes.sortOrder)),
    getCompetitionJudges(comp.id),
    getCompetitionFaqs(comp.id),
    getCompetitionCounts([comp.id]),
    getTimeline(comp.eventId),
    db
      .select()
      .from(schema.judgingCriteria)
      .where(and(eq(schema.judgingCriteria.competitionId, comp.id), eq(schema.judgingCriteria.published, true)))
      .orderBy(asc(schema.judgingCriteria.sortOrder)),
    db
      .select()
      .from(schema.scheduleItems)
      .where(and(eq(schema.scheduleItems.competitionId, comp.id), eq(schema.scheduleItems.published, true)))
      .orderBy(asc(schema.scheduleItems.date), asc(schema.scheduleItems.startTime)),
  ])

  return {
    ...comp,
    event,
    prizes,
    judges,
    faqs,
    timeline,
    criteria,
    schedule,
    registeredTeams: counts[comp.id] ?? 0,
  }
}

// ---- Judge portal ----

/**
 * Criteria a judge scores a competition against: event-wide (competitionId
 * null) plus that competition's own, regardless of `published`. `published`
 * only gates the public competition page — decoupled deliberately, so hiding
 * a criterion from the public page never breaks a judge's ability to keep
 * scoring against it.
 */
export async function getScoringCriteria(competitionId: number) {
  const db = useDb()
  const comp = await db.select({ eventId: schema.competitions.eventId }).from(schema.competitions).where(eq(schema.competitions.id, competitionId)).get()
  if (!comp) return []
  return db
    .select()
    .from(schema.judgingCriteria)
    .where(or(eq(schema.judgingCriteria.competitionId, competitionId), and(isNull(schema.judgingCriteria.competitionId), eq(schema.judgingCriteria.eventId, comp.eventId))))
    .orderBy(asc(schema.judgingCriteria.sortOrder))
}

/**
 * Ranked standings for one competition. Single source of truth called by both
 * the judge-facing and admin leaderboard routes so the ranking math never
 * drifts between the two.
 *
 * A team's score from one judge = sum of (rating/10 * criterion.weight) across
 * every in-scope criterion; that judge counts "complete" for a team only once
 * they've scored every criterion. A team's averageScore is the mean across
 * complete judges only (null if none). Both the "M" in "N of M" and which
 * judges' rows are even considered come from *current* judgeAssignments — a
 * since-unassigned judge's old rows never count, so the denominator can't get
 * permanently stuck.
 */
export async function getLeaderboard(competitionId: number) {
  const db = useDb()
  const criteria = await getScoringCriteria(competitionId)
  const criteriaIds = criteria.map((c) => c.id)
  const weightById = Object.fromEntries(criteria.map((c) => [c.id, c.weight]))

  const currentJudges = await db
    .select({ judgeId: schema.judgeAccounts.id, judgeName: schema.judgeAccounts.fullName })
    .from(schema.judgeAssignments)
    .innerJoin(schema.people, eq(schema.people.id, schema.judgeAssignments.personId))
    .innerJoin(schema.judgeAccounts, and(eq(schema.judgeAccounts.personId, schema.people.id), eq(schema.judgeAccounts.status, 'active')))
    .where(eq(schema.judgeAssignments.competitionId, competitionId))
  const judgeIds = currentJudges.map((j) => j.judgeId)
  const judgeNameById = Object.fromEntries(currentJudges.map((j) => [j.judgeId, j.judgeName]))

  const teams = await db
    .select({ id: schema.registrations.id, teamName: schema.registrations.teamName, fullName: schema.registrations.fullName, institution: schema.registrations.institution })
    .from(schema.registrations)
    .where(and(eq(schema.registrations.competitionId, competitionId), eq(schema.registrations.status, 'confirmed')))

  const rows =
    criteriaIds.length && judgeIds.length && teams.length
      ? await db
          .select()
          .from(schema.scores)
          .where(and(eq(schema.scores.competitionId, competitionId), inArray(schema.scores.criterionId, criteriaIds), inArray(schema.scores.judgeId, judgeIds)))
      : []

  const results = teams.map((team) => {
    const teamRows = rows.filter((r) => r.registrationId === team.id)
    const perJudge: { judgeId: number; total: number; complete: boolean }[] = []
    const perCriterionSum: Record<number, { sum: number; n: number }> = {}

    for (const judgeId of judgeIds) {
      const judgeRows = teamRows.filter((r) => r.judgeId === judgeId)
      const complete = judgeRows.length === criteriaIds.length
      const total = judgeRows.reduce((acc, r) => acc + (r.value / 10) * (weightById[r.criterionId] ?? 0), 0)
      if (complete) {
        perJudge.push({ judgeId, total, complete })
        for (const r of judgeRows) {
          const contribution = (r.value / 10) * (weightById[r.criterionId] ?? 0)
          const bucket = (perCriterionSum[r.criterionId] ??= { sum: 0, n: 0 })
          bucket.sum += contribution
          bucket.n += 1
        }
      }
    }

    const judgesCompleted = perJudge.length
    const averageScore = judgesCompleted ? Math.round((perJudge.reduce((a, j) => a + j.total, 0) / judgesCompleted) * 10) / 10 : null
    const perCriterion = Object.fromEntries(Object.entries(perCriterionSum).map(([id, { sum, n }]) => [id, Math.round((sum / n) * 10) / 10]))

    return {
      registrationId: team.id,
      teamName: team.teamName,
      fullName: team.fullName,
      institution: team.institution,
      averageScore,
      judgesCompleted,
      judgesTotal: judgeIds.length,
      perCriterion,
      // Raw per-judge breakdown for the admin drill-down; the judge-facing
      // route strips this before returning.
      judgeBreakdown: judgeIds.map((judgeId) => {
        const judgeRows = teamRows.filter((r) => r.judgeId === judgeId)
        return {
          judgeId,
          judgeName: judgeNameById[judgeId],
          complete: judgeRows.length === criteriaIds.length,
          scores: Object.fromEntries(judgeRows.map((r) => [r.criterionId, r.value])),
        }
      }),
    }
  })

  results.sort((a, b) => {
    if (a.averageScore === null && b.averageScore === null) return 0
    if (a.averageScore === null) return 1
    if (b.averageScore === null) return -1
    return b.averageScore - a.averageScore
  })

  let nextRank = 1
  const ranked = results.map((r) => ({ ...r, rank: r.averageScore === null ? null : nextRank++ }))

  return {
    competitionId,
    criteria: criteria.map((c) => ({ id: c.id, name: c.name, weight: c.weight })),
    judgesTotal: judgeIds.length,
    teams: ranked,
  }
}
