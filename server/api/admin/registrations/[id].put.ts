import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../../database/client'
import { registrationStatusSchema, idParam } from '../../../utils/validation'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = idParam.parse(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, registrationStatusSchema.parse)

  const [row] = await useDb()
    .update(schema.registrations)
    .set({ status: body.status })
    .where(eq(schema.registrations.id, id))
    .returning()

  if (!row) throw createError({ statusCode: 404, statusMessage: 'Registration not found' })
  return row
})
