import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../../database/client'
import { registrationStatusSchema, idParam } from '../../../utils/validation'
import { sendMail, applicationConfirmedEmail, applicationRejectedEmail } from '../../../utils/email'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
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
    })
    .where(eq(schema.registrations.id, id))
    .returning()

  if (!row) throw createError({ statusCode: 404, statusMessage: 'Registration not found' })

  // Only email on an actual change into confirmed/rejected — re-clicking the
  // same decision (or editing just the note) never sends a duplicate.
  if (before && before.status !== row.status && (row.status === 'confirmed' || row.status === 'rejected')) {
    const comp = await db.select({ name: schema.competitions.name }).from(schema.competitions).where(eq(schema.competitions.id, row.competitionId)).get()
    const opts = { name: row.fullName, teamName: row.teamName ?? '', competition: comp?.name ?? '', note: row.decisionNote }
    const mail = row.status === 'confirmed' ? applicationConfirmedEmail(opts) : applicationRejectedEmail(opts)
    sendMail({ to: row.email, ...mail }).catch(() => {})
  }

  return row
})
