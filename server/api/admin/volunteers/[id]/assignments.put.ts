import { eq, inArray } from 'drizzle-orm'
import { useDb, schema } from '../../../../database/client'
import { idParam, volunteerAssignmentSchema } from '../../../../utils/validation'

// Replace a volunteer's competition assignments. A volunteer works exactly one
// event, so every competition in the list must share an event.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const adminId = idParam.parse(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, volunteerAssignmentSchema.parse)
  const db = useDb()

  const volunteer = await db.select().from(schema.admins).where(eq(schema.admins.id, adminId)).get()
  if (!volunteer) throw createError({ statusCode: 404, statusMessage: 'Volunteer not found' })
  if (volunteer.role !== 'volunteer') {
    throw createError({ statusCode: 400, statusMessage: 'Only volunteers take competition assignments.' })
  }

  const ids = [...new Set(body.competitionIds)]
  let eventId: number | null = null

  if (ids.length) {
    const comps = await db
      .select({ id: schema.competitions.id, eventId: schema.competitions.eventId })
      .from(schema.competitions)
      .where(inArray(schema.competitions.id, ids))
    if (comps.length !== ids.length) {
      throw createError({ statusCode: 400, statusMessage: 'One of those competitions does not exist.' })
    }
    const events = new Set(comps.map((c) => c.eventId))
    if (events.size > 1) {
      throw createError({ statusCode: 400, statusMessage: 'A volunteer can only work competitions from one event.' })
    }
    eventId = comps[0]!.eventId
  }

  const statements = [db.delete(schema.volunteerAssignments).where(eq(schema.volunteerAssignments.adminId, adminId))]
  if (ids.length) {
    statements.push(
      db
        .insert(schema.volunteerAssignments)
        .values(ids.map((competitionId) => ({ adminId, eventId: eventId!, competitionId }))) as any,
    )
  }
  await db.batch(statements as [(typeof statements)[number], ...(typeof statements)[number][]])

  return { ok: true, competitionIds: ids, eventId }
})
