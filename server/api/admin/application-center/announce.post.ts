import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../../database/client'
import { idParam, isoDate } from '../../../utils/validation'
import { recordAudit } from '../../../utils/audit'
import { releaseDueDecisions } from '../../../utils/decisions'

// Two jobs on one route, because they are the same decision from the admin's
// point of view: schedule the announcement, or send it now.
//   { announceAt: '2026-09-01' } -> hold results until that date
//   { announceAt: null }         -> no embargo; pending results go out now
//   { sendNow: true }            -> release this competition immediately
const bodySchema = z.object({
  competitionId: idParam,
  announceAt: isoDate.nullable().optional(),
  sendNow: z.boolean().default(false),
})

export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const body = await readValidatedBody(event, bodySchema.parse)
  const db = useDb()

  const comp = await db.select().from(schema.competitions).where(eq(schema.competitions.id, body.competitionId)).get()
  if (!comp) throw createError({ statusCode: 404, statusMessage: 'Competition not found' })

  if (body.announceAt !== undefined) {
    await db
      .update(schema.competitions)
      .set({ resultsAnnounceAt: body.announceAt })
      .where(eq(schema.competitions.id, body.competitionId))

    await recordAudit(actor, {
      action: 'update',
      entity: 'competition',
      entityId: comp.id,
      summary: body.announceAt
        ? `Scheduled "${comp.name}" results for ${body.announceAt}`
        : `Removed the results embargo on "${comp.name}"`,
    })
  }

  // "Send now" clears the embargo first — leaving a future date in place while
  // mailing everyone would make the stored schedule a lie.
  if (body.sendNow) {
    await db
      .update(schema.competitions)
      .set({ resultsAnnounceAt: null })
      .where(eq(schema.competitions.id, body.competitionId))
  }

  const sent = await releaseDueDecisions(body.competitionId)
  if (sent) {
    await recordAudit(actor, {
      action: 'notify',
      entity: 'competition',
      entityId: comp.id,
      summary: `Announced results for "${comp.name}" — ${sent} team${sent === 1 ? '' : 's'} emailed`,
    })
  }

  return { ok: true, sent }
})
