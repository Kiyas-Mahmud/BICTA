import { desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { useDb, schema } from '../../../database/client'

const querySchema = z.object({
  competitionId: z.coerce.number().int().positive().optional(),
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

  const rows = await db
    .select({
      id: schema.registrations.id,
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
    .where(q.competitionId ? eq(schema.registrations.competitionId, q.competitionId) : undefined)
    .orderBy(desc(schema.registrations.createdAt))

  const header = ['ID', 'Competition', 'Full name', 'Email', 'Phone', 'Institution', 'Team name', 'Team members', 'Status', 'Registered at']
  const lines = [
    header.map(csvCell).join(','),
    ...rows.map((r) =>
      [
        r.id,
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
