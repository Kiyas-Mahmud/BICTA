import { eq, desc, asc, and, ne, inArray } from 'drizzle-orm'
import { useDb, schema } from '../database/client'

export async function getCurrentEventFull() {
  const db = useDb()
  const event = db.select().from(schema.events).where(eq(schema.events.isCurrent, true)).get()
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

export function getCompetitionBySlug(slug: string) {
  const db = useDb()
  const comp = db.select().from(schema.competitions).where(eq(schema.competitions.slug, slug)).get()
  if (!comp) return null
  const event = db.select().from(schema.events).where(eq(schema.events.id, comp.eventId)).get()
  const prizes = db
    .select()
    .from(schema.prizes)
    .where(eq(schema.prizes.competitionId, comp.id))
    .orderBy(asc(schema.prizes.sortOrder))
    .all()
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

export function getPublishedNewsBySlug(slug: string) {
  return (
    useDb()
      .select()
      .from(schema.news)
      .where(and(eq(schema.news.slug, slug), eq(schema.news.status, 'published')))
      .get() ?? null
  )
}

export async function getPastEvents() {
  return useDb()
    .select({
      id: schema.events.id,
      title: schema.events.title,
      year: schema.events.year,
      slug: schema.events.slug,
      heroImage: schema.events.heroImage,
      startDate: schema.events.startDate,
      endDate: schema.events.endDate,
      venue: schema.events.venue,
    })
    .from(schema.events)
    .where(and(eq(schema.events.status, 'past'), ne(schema.events.isCurrent, true)))
    .orderBy(desc(schema.events.year))
}

export async function getEventBySlug(slug: string) {
  const db = useDb()
  const event = db.select().from(schema.events).where(eq(schema.events.slug, slug)).get()
  if (!event) return null

  const competitions = await db
    .select()
    .from(schema.competitions)
    .where(eq(schema.competitions.eventId, event.id))
    .orderBy(asc(schema.competitions.sortOrder))

  const gallery = await db
    .select()
    .from(schema.galleryImages)
    .where(eq(schema.galleryImages.eventId, event.id))
    .orderBy(asc(schema.galleryImages.sortOrder))

  return { ...event, competitions, gallery }
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

export function getSponsors() {
  return useDb().select().from(schema.sponsors).orderBy(asc(schema.sponsors.sortOrder)).all()
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

export function getEventGallery(eventId: number) {
  return useDb()
    .select()
    .from(schema.galleryImages)
    .where(eq(schema.galleryImages.eventId, eventId))
    .orderBy(asc(schema.galleryImages.sortOrder))
    .all()
}
