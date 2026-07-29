import { asc, desc, eq, and, or, like, type SQL } from 'drizzle-orm'
import { z } from 'zod'
import { useDb, schema } from '../../../database/client'

// Mirrors the filters on the list endpoint so "Export" always means "export
// exactly what I am looking at". Sorting is honoured too; paging is not, on
// purpose — an export is the whole filtered set.
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
})

// Guard against CSV formula injection: Excel executes cells starting with
// = + - @, so attacker-supplied names get a leading apostrophe.
function csvCell(value: unknown): string {
  let s = value == null ? '' : String(value)
  if (/^[=+\-@]/.test(s)) s = `'${s}`
  return `"${s.replace(/"/g, '""')}"`
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const q = await getValidatedQuery(event, querySchema.parse)
  const db = useDb()

  const filters: SQL[] = []
  if (q.eventId) filters.push(eq(schema.competitions.eventId, q.eventId))
  if (q.competitionId) filters.push(eq(schema.registrations.competitionId, q.competitionId))
  if (q.status) filters.push(eq(schema.registrations.status, q.status))
  if (q.search) {
    const needle = `%${q.search.toLowerCase()}%`
    filters.push(
      or(
        like(schema.registrations.fullName, needle),
        like(schema.registrations.email, needle),
        like(schema.registrations.teamName, needle),
        like(schema.registrations.institution, needle),
        like(schema.competitions.name, needle),
      )!,
    )
  }

  const rows = await db
    .select({
      id: schema.registrations.id,
      event: schema.events.title,
      competition: schema.competitions.name,
      fullName: schema.registrations.fullName,
      email: schema.registrations.email,
      phone: schema.registrations.phone,
      institution: schema.registrations.institution,
      teamName: schema.registrations.teamName,
      teamMembers: schema.registrations.teamMembers,
      status: schema.registrations.status,
      createdAt: schema.registrations.createdAt,
    })
    .from(schema.registrations)
    .innerJoin(schema.competitions, eq(schema.competitions.id, schema.registrations.competitionId))
    .innerJoin(schema.events, eq(schema.events.id, schema.competitions.eventId))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(q.dir === 'asc' ? asc(SORTS[q.sort]) : desc(SORTS[q.sort]))

  const header = ['ID', 'Event', 'Competition', 'Full name', 'Email', 'Phone', 'Institution', 'Team name', 'Team members', 'Status', 'Registered at']
  const lines = [
    header.map(csvCell).join(','),
    ...rows.map((r) =>
      [
        r.id,
        r.event,
        r.competition,
        r.fullName,
        r.email,
        r.phone,
        r.institution,
        r.teamName,
        (r.teamMembers ?? []).map((m) => `${m.name} <${m.email}>`).join('; '),
        r.status,
        r.createdAt,
      ]
        .map(csvCell)
        .join(','),
    ),
  ]

  setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
  setHeader(event, 'Content-Disposition', `attachment; filename="bicta-registrations-${new Date().toISOString().slice(0, 10)}.csv"`)
  return lines.join('\r\n')
})
