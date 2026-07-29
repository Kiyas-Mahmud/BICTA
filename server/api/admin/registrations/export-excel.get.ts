import { asc, desc, eq, and, or, like, type SQL } from 'drizzle-orm'
import { z } from 'zod'
import { useDb, schema } from '../../../database/client'
import { buildSpreadsheet, spreadsheetHeaders } from '../../../utils/sheet'

// Same filter surface as the list and the CSV export.
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

  const xml = buildSpreadsheet(
    'Registrations',
    ['ID', 'Event', 'Competition', 'Full name', 'Email', 'Phone', 'Institution', 'Team name', 'Team members', 'Status', 'Registered at'],
    rows.map((r) => [
      r.id,
      r.event,
      r.competition,
      r.fullName,
      r.email,
      r.phone,
      r.institution,
      r.teamName ?? '',
      (r.teamMembers ?? []).map((m) => `${m.name} <${m.email}>`).join('; '),
      r.status,
      r.createdAt,
    ]),
  )

  spreadsheetHeaders(event, `bicta-registrations-${new Date().toISOString().slice(0, 10)}`)
  return xml
})
