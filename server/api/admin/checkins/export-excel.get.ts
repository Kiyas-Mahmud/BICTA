import { collectionQuerySchema, collectionRows } from './index.get'
import { buildSpreadsheet, spreadsheetHeaders } from '../../../utils/sheet'

// Same filters as the report and the CSV export.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const q = await getValidatedQuery(event, collectionQuerySchema.parse)
  const rows = await collectionRows(q)

  const xml = buildSpreadsheet(
    'Collection',
    ['Participant', 'Email', 'Event', 'Competition', 'Check-in point', 'Location', 'Collected by', 'Collected at'],
    rows.map((r) => [
      r.participant,
      r.email,
      r.event,
      r.competition ?? 'Event-wide',
      r.checkpoint,
      r.checkpointLocation,
      r.collectedBy ?? '',
      r.collectedAt,
    ]),
  )

  spreadsheetHeaders(event, `bicta-collection-${new Date().toISOString().slice(0, 10)}`)
  return xml
})
