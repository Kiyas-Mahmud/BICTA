import { eq, asc } from 'drizzle-orm'
import { useDb, schema } from '../../../database/client'

// CSV formula-injection guard (Excel executes =, +, -, @ leading cells).
function csvCell(value: unknown): string {
  let s = value == null ? '' : String(value)
  if (/^[=+\-@]/.test(s)) s = `'${s}`
  return `"${s.replace(/"/g, '""')}"`
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const db = useDb()

  const current = db.select({ id: schema.events.id }).from(schema.events).where(eq(schema.events.isCurrent, true)).get()
  if (!current) return ''

  const checkpoints = await db
    .select()
    .from(schema.checkpoints)
    .where(eq(schema.checkpoints.eventId, current.id))
    .orderBy(asc(schema.checkpoints.sortOrder))

  const rows = await db
    .select({
      accountId: schema.participantAccounts.id,
      fullName: schema.participantAccounts.fullName,
      email: schema.participantAccounts.email,
      role: schema.teamMembers.role,
      teamName: schema.registrations.teamName,
      competition: schema.competitions.name,
    })
    .from(schema.teamMembers)
    .innerJoin(schema.participantAccounts, eq(schema.participantAccounts.id, schema.teamMembers.accountId))
    .innerJoin(schema.registrations, eq(schema.registrations.id, schema.teamMembers.registrationId))
    .innerJoin(schema.competitions, eq(schema.competitions.id, schema.registrations.competitionId))
    .where(eq(schema.competitions.eventId, current.id))

  const allCheckins = await db.select().from(schema.checkins)
  const collectedSet = new Set(allCheckins.map((ci) => `${ci.accountId}:${ci.checkpointId}`))

  const header = ['Name', 'Email', 'Role', 'Team', 'Competition', ...checkpoints.map((c) => c.name)]
  const lines = [
    header.map(csvCell).join(','),
    ...rows.map((r) =>
      [
        r.fullName,
        r.email,
        r.role,
        r.teamName ?? '',
        r.competition,
        ...checkpoints.map((c) => (collectedSet.has(`${r.accountId}:${c.id}`) ? 'Yes' : 'No')),
      ]
        .map(csvCell)
        .join(','),
    ),
  ]

  setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
  setHeader(event, 'Content-Disposition', `attachment; filename="bicta-collection-${new Date().toISOString().slice(0, 10)}.csv"`)
  return lines.join('\r\n')
})
