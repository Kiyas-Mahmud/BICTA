import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { useDb, schema } from '../../../database/client'
import { idParam } from '../../../utils/validation'

const readSchema = z.object({ isRead: z.boolean() })

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = idParam.parse(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, readSchema.parse)

  const [row] = await useDb()
    .update(schema.contactMessages)
    .set({ isRead: body.isRead })
    .where(eq(schema.contactMessages.id, id))
    .returning()

  if (!row) throw createError({ statusCode: 404, statusMessage: 'Message not found' })
  return row
})
