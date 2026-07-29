import { collectionQuerySchema, collectionRows } from './index.get'

// CSV formula-injection guard (Excel executes =, +, -, @ leading cells).
function csvCell(value: unknown): string {
  let s = value == null ? '' : String(value)
  if (/^[=+\-@]/.test(s)) s = `'${s}`
  return `"${s.replace(/"/g, '""')}"`
}

// Same filters as the report, so "Export" means "export what I am looking at".
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const q = await getValidatedQuery(event, collectionQuerySchema.parse)
  const rows = await collectionRows(q)

  const header = ['Participant', 'Email', 'Event', 'Competition', 'Check-in point', 'Location', 'Collected by', 'Collected at']
  const lines = [
    header.map(csvCell).join(','),
    ...rows.map((r) =>
      [
        r.participant,
        r.email,
        r.event,
        r.competition ?? 'Event-wide',
        r.checkpoint,
        r.checkpointLocation,
        r.collectedBy ?? '',
        r.collectedAt,
      ]
        .map(csvCell)
        .join(','),
    ),
  ]

  setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
  setHeader(event, 'Content-Disposition', `attachment; filename="bicta-collection-${new Date().toISOString().slice(0, 10)}.csv"`)
  return lines.join('\r\n')
})
