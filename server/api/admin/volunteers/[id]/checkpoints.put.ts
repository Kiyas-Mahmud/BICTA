import { eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { useDb, schema } from '../../../../database/client'
import { idParam } from '../../../../utils/validation'

const bodySchema = z.object({
  checkpointIds: z.array(z.coerce.number().int().positive()).max(100).default([]),
})

// Which check-in points this volunteer staffs. Edited from the volunteer side
// because that is where the rest of their assignment lives.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const adminId = idParam.parse(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, bodySchema.parse)
  const db = useDb()

  const volunteer = await db.select().from(schema.admins).where(eq(schema.admins.id, adminId)).get()
  if (!volunteer) throw createError({ statusCode: 404, statusMessage: 'Volunteer not found' })
  if (volunteer.role !== 'volunteer') {
    throw createError({ statusCode: 400, statusMessage: 'Only volunteers staff check-in points.' })
  }

  const ids = [...new Set(body.checkpointIds)]
  if (ids.length) {
    const found = await db
      .select({ id: schema.checkpoints.id })
      .from(schema.checkpoints)
      .where(inArray(schema.checkpoints.id, ids))
    if (found.length !== ids.length) {
      throw createError({ statusCode: 400, statusMessage: 'One of those check-in points does not exist.' })
    }
  }

  const statements = [db.delete(schema.checkpointVolunteers).where(eq(schema.checkpointVolunteers.adminId, adminId))]
  if (ids.length) {
    statements.push(
      db.insert(schema.checkpointVolunteers).values(ids.map((checkpointId) => ({ adminId, checkpointId }))) as any,
    )
  }
  await db.batch(statements as [(typeof statements)[number], ...(typeof statements)[number][]])

  return { ok: true, checkpointIds: ids }
})
