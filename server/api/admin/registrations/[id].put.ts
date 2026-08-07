import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../../database/client'
import { registrationStatusSchema, idParam } from '../../../utils/validation'
import { recordAudit } from '../../../utils/audit'
import { announcementDue, sendDecisionMail } from '../../../utils/decisions'

export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const id = idParam.parse(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, registrationStatusSchema.parse)
  const db = useDb()

  const before = await db.select({ status: schema.registrations.status }).from(schema.registrations).where(eq(schema.registrations.id, id)).get()

  const [row] = await db
    .update(schema.registrations)
    .set({
      status: body.status,
      decisionNote: body.decisionNote,
      decisionAt: body.status === 'pending' ? null : new Date().toISOString(),
      // Reopening a decision clears the sent-marker, so if it is decided again
      // later the team is told about the new outcome.
      decisionNotifiedAt: body.status === 'pending' ? null : undefined,
    })
    .where(eq(schema.registrations.id, id))
    .returning()

  if (!row) throw createError({ statusCode: 404, statusMessage: 'Registration not found' })

  const changed = Boolean(before && before.status !== row.status)
  const decided = row.status === 'confirmed' || row.status === 'rejected'

  // Only email on an actual change into confirmed/rejected — re-clicking the
  // same decision (or editing just the note) never sends a duplicate. When the
  // competition has an announcement date in the future the mail is held; the
  // scheduled sweep in utils/decisions.ts sends it when that date arrives.
  let notified = false
  if (changed && decided) {
    const comp = await db
      .select({ name: schema.competitions.name, resultsAnnounceAt: schema.competitions.resultsAnnounceAt })
      .from(schema.competitions)
      .where(eq(schema.competitions.id, row.competitionId))
      .get()

    if (announcementDue(comp?.resultsAnnounceAt)) {
      await sendDecisionMail(row, comp?.name ?? '')
      notified = true
    }
  }

  if (changed) {
    await recordAudit(actor, {
      action: 'decide',
      entity: 'registration',
      entityId: row.id,
      summary: `Marked ${row.teamName || row.fullName} as ${row.status}${decided ? (notified ? ' (team notified)' : ' (notification scheduled)') : ''}`,
    })
  }

  return { ...row, notified }
})
