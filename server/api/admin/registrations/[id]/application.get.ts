import { eq, asc } from 'drizzle-orm'
import { useDb, schema } from '../../../../database/client'
import { idParam } from '../../../../utils/validation'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const registrationId = idParam.parse(getRouterParam(event, 'id'))
  const db = useDb()

  const registration = await db.select().from(schema.registrations).where(eq(schema.registrations.id, registrationId)).get()
  if (!registration) throw createError({ statusCode: 404, statusMessage: 'Registration not found' })

  const [fields, responses] = await Promise.all([
    db
      .select()
      .from(schema.applicationFields)
      .where(eq(schema.applicationFields.competitionId, registration.competitionId))
      .orderBy(asc(schema.applicationFields.sortOrder)),
    db.select().from(schema.applicationResponses).where(eq(schema.applicationResponses.registrationId, registrationId)),
  ])
  const byField = new Map(responses.map((r) => [r.fieldId, r]))

  return fields.map((f) => {
    const r = byField.get(f.id)
    return {
      id: f.id,
      label: f.label,
      fieldType: f.fieldType,
      textValue: r?.textValue ?? null,
      fileUrl: r?.fileUrl ?? null,
      fileName: r?.fileName ?? null,
    }
  })
})
