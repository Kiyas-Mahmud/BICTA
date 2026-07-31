import { eq, and, asc } from 'drizzle-orm'
import { useDb, schema } from '../../../../database/client'
import { idParam } from '../../../../utils/validation'

// Any team member (leader or ordinary member) may view the submitted
// application — editing is leader-only, enforced separately in the PUT route.
export default defineEventHandler(async (event) => {
  const registrationId = idParam.parse(getRouterParam(event, 'id'))
  const me = await requireParticipant(event)
  const db = useDb()

  const membership = await db
    .select({ role: schema.teamMembers.role })
    .from(schema.teamMembers)
    .where(and(eq(schema.teamMembers.registrationId, registrationId), eq(schema.teamMembers.accountId, me.id)))
    .get()
  if (!membership) throw createError({ statusCode: 403, statusMessage: 'You are not on this team.' })

  const registration = await db.select().from(schema.registrations).where(eq(schema.registrations.id, registrationId)).get()
  if (!registration) throw createError({ statusCode: 404, statusMessage: 'Team not found' })

  const [fields, responses] = await Promise.all([
    db
      .select()
      .from(schema.applicationFields)
      .where(eq(schema.applicationFields.competitionId, registration.competitionId))
      .orderBy(asc(schema.applicationFields.sortOrder)),
    db.select().from(schema.applicationResponses).where(eq(schema.applicationResponses.registrationId, registrationId)),
  ])
  const byField = new Map(responses.map((r) => [r.fieldId, r]))

  return {
    canEdit: membership.role === 'leader' && registration.status === 'pending',
    fields: fields.map((f) => {
      const r = byField.get(f.id)
      return {
        id: f.id,
        label: f.label,
        helpText: f.helpText,
        fieldType: f.fieldType,
        required: f.required,
        textValue: r?.textValue ?? null,
        fileUrl: r?.fileUrl ?? null,
        fileName: r?.fileName ?? null,
      }
    }),
  }
})
