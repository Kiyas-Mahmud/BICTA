import { desc } from 'drizzle-orm'
import { useDb, schema } from '../../../database/client'

// Guard against CSV formula injection (Excel executes =, +, -, @ leading cells).
function csvCell(value: unknown): string {
  let s = value == null ? '' : String(value)
  if (/^[=+\-@]/.test(s)) s = `'${s}`
  return `"${s.replace(/"/g, '""')}"`
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const rows = await useDb()
    .select()
    .from(schema.newsletterSubscribers)
    .orderBy(desc(schema.newsletterSubscribers.createdAt))

  const lines = [
    ['Email', 'Subscribed at'].map(csvCell).join(','),
    ...rows.map((r) => [r.email, r.createdAt].map(csvCell).join(',')),
  ]

  setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
  setHeader(event, 'Content-Disposition', `attachment; filename="bicta-subscribers-${new Date().toISOString().slice(0, 10)}.csv"`)
  return lines.join('\r\n')
})
