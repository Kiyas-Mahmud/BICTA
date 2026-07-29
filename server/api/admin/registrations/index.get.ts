import { asc, desc, eq, and, or, like, count, type SQL } from 'drizzle-orm'
import { z } from 'zod'
import { useDb, schema } from '../../../database/client'

// Hierarchical filtering: Event -> Competition -> registrations, combined with
// free-text search, sorting and pagination. Every filter is applied in SQL so
// paging and totals stay correct (a client-side filter would only ever narrow
// the current page).
const SORTS = {
  createdAt: schema.registrations.createdAt,
  fullName: schema.registrations.fullName,
  email: schema.registrations.email,
  status: schema.registrations.status,
  competition: schema.competitions.name,
  teamName: schema.registrations.teamName,
} as const

const querySchema = z.object({
  eventId: z.coerce.number().int().positive().optional(),
  competitionId: z.coerce.number().int().positive().optional(),
  status: z.enum(['pending', 'confirmed', 'rejected']).optional(),
  search: z.string().trim().max(200).optional(),
  sort: z.enum(['createdAt', 'fullName', 'email', 'status', 'competition', 'teamName']).default('createdAt'),
  dir: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(200).default(25),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const q = await getValidatedQuery(event, querySchema.parse)
  const db = useDb()

  // Scope filters (everything except status) are shared with the tallies, so
  // the status tiles keep showing the full picture for the current scope.
  const scope: SQL[] = []
  if (q.eventId) scope.push(eq(schema.competitions.eventId, q.eventId))
  if (q.competitionId) scope.push(eq(schema.registrations.competitionId, q.competitionId))
  if (q.search) {
    const needle = `%${q.search.toLowerCase()}%`
    scope.push(
      or(
        like(schema.registrations.fullName, needle),
        like(schema.registrations.email, needle),
        like(schema.registrations.teamName, needle),
        like(schema.registrations.institution, needle),
        like(schema.competitions.name, needle),
      )!,
    )
  }

  const filters = q.status ? [...scope, eq(schema.registrations.status, q.status)] : scope
  const where = filters.length ? and(...filters) : undefined
  const scopeWhere = scope.length ? and(...scope) : undefined

  const [totals] = await db
    .select({ n: count() })
    .from(schema.registrations)
    .innerJoin(schema.competitions, eq(schema.competitions.id, schema.registrations.competitionId))
    .where(where)
  const total = totals?.n ?? 0

  // Status tallies for the summary tiles: same scope, status ignored, so the
  // tiles can double as the status switcher without their numbers collapsing.
  const statusRows = await db
    .select({ status: schema.registrations.status, n: count() })
    .from(schema.registrations)
    .innerJoin(schema.competitions, eq(schema.competitions.id, schema.registrations.competitionId))
    .where(scopeWhere)
    .groupBy(schema.registrations.status)
  const counts = { total: 0, pending: 0, confirmed: 0, rejected: 0 }
  for (const r of statusRows) {
    counts[r.status as 'pending' | 'confirmed' | 'rejected'] = r.n
    counts.total += r.n
  }

  const order = q.dir === 'asc' ? asc(SORTS[q.sort]) : desc(SORTS[q.sort])

  const rows = await db
    .select({
      id: schema.registrations.id,
      competitionId: schema.registrations.competitionId,
      competitionName: schema.competitions.name,
      eventId: schema.competitions.eventId,
      eventTitle: schema.events.title,
      fullName: schema.registrations.fullName,
      email: schema.registrations.email,
      phone: schema.registrations.phone,
      institution: schema.registrations.institution,
      teamName: schema.registrations.teamName,
      teamMembers: schema.registrations.teamMembers,
      notes: schema.registrations.notes,
      status: schema.registrations.status,
      createdAt: schema.registrations.createdAt,
    })
    .from(schema.registrations)
    .innerJoin(schema.competitions, eq(schema.competitions.id, schema.registrations.competitionId))
    .innerJoin(schema.events, eq(schema.events.id, schema.competitions.eventId))
    .where(where)
    .orderBy(order)
    .limit(q.perPage)
    .offset((q.page - 1) * q.perPage)

  return {
    rows,
    counts,
    page: q.page,
    perPage: q.perPage,
    total,
    totalPages: Math.max(1, Math.ceil(total / q.perPage)),
  }
})
