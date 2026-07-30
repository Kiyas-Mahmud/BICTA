import { asc, count, desc, eq, inArray } from 'drizzle-orm'
import { useDb, schema } from '../database/client'

// Maps the real admin database onto the shapes the public site expects. Two
// distinct concepts, kept deliberately separate (they used to be flattened
// into one "HackathonEvent" per competition, which hid the real event ->
// competitions hierarchy from the public site):
//   - EventListingDTO: one row per real event/edition (the `events` table).
//   - CompetitionDTO: one row per competition, always carrying its eventId so
//     pages can build the nested /events/[eventId]/[competitionId] URL.

const FALLBACK_EVENT_IMG = '/gallery-images/hackathons.jpg'
const FALLBACK_NEWS_IMG = '/gallery-images/images.jpg'

export interface CompetitionDTO {
  id: string
  slug: string
  eventId: string
  eventSlug: string
  eventTitle: string
  title: string
  status: 'ongoing' | 'upcoming' | 'past'
  startDate: string
  endDate: string
  location: string
  prize: string
  tags: string[]
  organizer: string
  teamSizeMin: number
  teamSizeMax: number
  description: string
  imageUrl: string
  registrationDeadline: string
  website: string
  eligibility?: string
  registrationOpen: boolean
  registeredCount: number
  prizes: Array<{ position: string; amount: string; note: string | null }>
  judges: Array<{ name: string; role: string; avatar: string }>
  sponsors: Array<{ name: string; logo: string }>
  rules: string[]
  faqs: Array<{ id: number; question: string; answer: string }>
}

export interface EventListingDTO {
  id: string
  title: string
  slug: string
  year: number
  status: 'ongoing' | 'upcoming' | 'past'
  startDate: string
  endDate: string
  venue: string
  imageUrl: string
  description: string
  competitions: Array<{
    id: string
    slug: string
    name: string
    type: string
    imageUrl: string
    registrationOpen: boolean
    prize: string
  }>
}

export interface NewsItemDTO {
  id: string
  title: string
  category: string
  date: string
  excerpt: string
  imageUrl: string
  url: string
}

function htmlToText(html: string): string {
  return (html || '')
    .replace(/<\/(p|div|h[1-6]|li)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&rsquo;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim()
}

function htmlListToArray(html: string): string[] {
  const items = [...(html || '').matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map((m) => htmlToText(m[1]))
  if (items.length) return items.filter(Boolean)
  const text = htmlToText(html)
  if (!text) return []
  // No <li>: split into sentence-ish lines.
  return text.split(/\n|(?<=\.)\s+/).map((s) => s.trim()).filter(Boolean)
}

// Deterministic inline-SVG avatar/logo so nothing renders as a broken image.
function initialsImage(name: string): string {
  const letter = (name.trim()[0] || '?').toUpperCase()
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" rx="14" fill="#e7ede1"/><text x="50%" y="50%" dy=".35em" text-anchor="middle" font-family="sans-serif" font-size="44" font-weight="700" fill="#5e6f54">${letter}</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

// Shared base query: every competition, its parent event, prizes and
// registration counts. Both getCompetitions() and getPublicEvents() build on
// this so the two DTOs never drift apart.
async function loadCompetitionRows() {
  const db = useDb()

  // Draft editions stay off the public site entirely.
  const events = await db.select().from(schema.events).where(eq(schema.events.published, true))
  const eventById = new Map(events.map((e) => [e.id, e]))

  const competitions = (await db.select().from(schema.competitions).orderBy(asc(schema.competitions.sortOrder))).filter((c) =>
    eventById.has(c.eventId),
  )

  const prizes = competitions.length
    ? await db
        .select()
        .from(schema.prizes)
        .where(inArray(schema.prizes.competitionId, competitions.map((c) => c.id)))
        .orderBy(asc(schema.prizes.sortOrder))
    : []

  const regCounts = await db
    .select({ competitionId: schema.registrations.competitionId, n: count() })
    .from(schema.registrations)
    .groupBy(schema.registrations.competitionId)
  const countByComp = new Map(regCounts.map((r) => [r.competitionId, r.n]))

  return { events, eventById, competitions, prizes, countByComp }
}

export async function getCompetitions(): Promise<CompetitionDTO[]> {
  const db = useDb()
  const { eventById, competitions, prizes, countByComp } = await loadCompetitionRows()
  if (!competitions.length) return []

  const judgeRows = await db
    .select()
    .from(schema.people)
    .where(eq(schema.people.role, 'judge'))
    .orderBy(asc(schema.people.sortOrder))
  const sponsorRows = await db.select().from(schema.sponsors).orderBy(asc(schema.sponsors.sortOrder))
  const faqRows = await db.select().from(schema.faqs).orderBy(asc(schema.faqs.sortOrder))

  const judges = judgeRows.map((j) => ({
    name: j.name,
    role: [j.title, j.organization].filter(Boolean).join(' · '),
    avatar: j.photoUrl || initialsImage(j.name),
  }))
  const sponsors = sponsorRows.map((s) => ({ name: s.name, logo: s.logoUrl || initialsImage(s.name) }))
  const faqs = faqRows.map((f) => ({ id: f.id, question: f.question, answer: htmlToText(f.answer) }))

  return competitions.map((c) => {
    const e = eventById.get(c.eventId)
    const compPrizes = prizes.filter((p) => p.competitionId === c.id)
    const topPrize = compPrizes[0]
    return {
      id: String(c.id),
      slug: c.slug,
      eventId: String(c.eventId),
      eventSlug: e?.slug ?? String(c.eventId),
      eventTitle: e?.title ?? '',
      title: c.name,
      status: (e?.status ?? 'upcoming') as CompetitionDTO['status'],
      startDate: e?.startDate ?? '',
      endDate: e?.endDate ?? '',
      location: e?.venue || 'Online',
      prize: topPrize?.amount || 'TBD',
      tags: c.type ? [c.type] : [],
      organizer: 'BICTA',
      teamSizeMin: 1,
      teamSizeMax: c.maxTeamSize || 1,
      description: htmlToText(c.description),
      imageUrl: c.coverImage || e?.heroImage || FALLBACK_EVENT_IMG,
      registrationDeadline: c.registrationDeadline || e?.endDate || '',
      website: '',
      eligibility: '',
      registrationOpen: !!c.registrationOpen,
      registeredCount: countByComp.get(c.id) ?? 0,
      prizes: compPrizes.map((p) => ({ position: p.position, amount: p.amount, note: p.note })),
      judges,
      sponsors,
      rules: htmlListToArray(c.rules),
      faqs,
    }
  })
}

export async function getPublicEvents(): Promise<EventListingDTO[]> {
  const { events, competitions, prizes } = await loadCompetitionRows()
  if (!events.length) return []

  return events
    .map((e) => {
      const own = competitions.filter((c) => c.eventId === e.id)
      return {
        id: String(e.id),
        title: e.title,
        slug: e.slug,
        year: e.year,
        status: e.status,
        startDate: e.startDate ?? '',
        endDate: e.endDate ?? '',
        venue: e.venue || 'Online',
        imageUrl: e.heroImage || FALLBACK_EVENT_IMG,
        description: htmlToText(e.description),
        competitions: own.map((c) => {
          const topPrize = prizes.find((p) => p.competitionId === c.id)
          return {
            id: String(c.id),
            slug: c.slug,
            name: c.name,
            type: c.type,
            imageUrl: c.coverImage || e.heroImage || FALLBACK_EVENT_IMG,
            registrationOpen: !!c.registrationOpen,
            prize: topPrize?.amount || 'TBD',
          }
        }),
      }
    })
    .sort((a, b) => b.year - a.year)
}

export async function getNewsItems(): Promise<NewsItemDTO[]> {
  const rows = await useDb()
    .select()
    .from(schema.news)
    .where(eq(schema.news.status, 'published'))
    .orderBy(desc(schema.news.publishedAt))

  return rows.map((n) => ({
    id: String(n.id),
    title: n.title,
    category: 'News',
    date: n.publishedAt ?? n.createdAt,
    excerpt: n.excerpt,
    imageUrl: n.coverImage || FALLBACK_NEWS_IMG,
    url: `/news/${n.slug}`,
  }))
}
