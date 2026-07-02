import { asc, desc, eq, inArray } from 'drizzle-orm'
import { useDb, schema } from '../database/client'

// Maps the real admin database onto the shape Zubayer's front-end expects
// (HackathonEvent / NewsItem). One HackathonEvent == one competition, joined
// with its parent event for dates/venue/status, plus the global judges,
// sponsors and FAQs. This is the single translation layer between the two
// data models; the Vue pages consume it unchanged.

const FALLBACK_EVENT_IMG = '/gallery-images/hackathons.jpg'
const FALLBACK_NEWS_IMG = '/gallery-images/images.jpg'

export interface HackathonEventDTO {
  id: string
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
  judges: Array<{ name: string; role: string; avatar: string }>
  sponsors: Array<{ name: string; logo: string }>
  rules: string[]
  faqs: Array<{ id: number; question: string; answer: string }>
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
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" rx="14" fill="#eff5ff"/><text x="50%" y="50%" dy=".35em" text-anchor="middle" font-family="sans-serif" font-size="44" font-weight="700" fill="#2563eb">${letter}</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

export async function getHackathonEvents(): Promise<HackathonEventDTO[]> {
  const db = useDb()

  const events = await db.select().from(schema.events)
  const eventById = new Map(events.map((e) => [e.id, e]))

  const competitions = await db.select().from(schema.competitions).orderBy(asc(schema.competitions.sortOrder))
  if (!competitions.length) return []

  const prizes = await db
    .select()
    .from(schema.prizes)
    .where(inArray(schema.prizes.competitionId, competitions.map((c) => c.id)))
    .orderBy(asc(schema.prizes.sortOrder))

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
    const topPrize = prizes.find((p) => p.competitionId === c.id)
    return {
      id: String(c.id),
      title: c.name,
      status: (e?.status ?? 'upcoming') as HackathonEventDTO['status'],
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
      judges,
      sponsors,
      rules: htmlListToArray(c.rules),
      faqs,
    }
  })
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
