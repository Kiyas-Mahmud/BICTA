import { eq, desc, asc, and, or, isNull, inArray } from 'drizzle-orm'
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

export function getFaqs() {
  return useDb().select().from(schema.faqs).orderBy(asc(schema.faqs.sortOrder)).all()
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
