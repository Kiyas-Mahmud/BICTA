import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../../../database/client'
import { idParam, isoDate } from '../../../../utils/validation'

// Narrow endpoint so the application-form panel can save its own settings
// without round-tripping the whole competition form (rules, prizes, images).
const bodySchema = z
  .object({
    applicationRequired: z.boolean(),
    applicationOpensAt: isoDate.nullable(),
    applicationClosesAt: isoDate.nullable(),
  })
  .refine((b) => !b.applicationOpensAt || !b.applicationClosesAt || b.applicationOpensAt <= b.applicationClosesAt, {
    message: 'The submission window cannot close before it opens.',
  })

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = idParam.parse(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, bodySchema.parse)

  const [row] = await useDb()
    .update(schema.competitions)
    .set({
      applicationRequired: body.applicationRequired,
      applicationOpensAt: body.applicationOpensAt,
      applicationClosesAt: body.applicationClosesAt,
    })
    .where(eq(schema.competitions.id, id))
    .returning()

  if (!row) throw createError({ statusCode: 404, statusMessage: 'Competition not found' })
  return row
})
