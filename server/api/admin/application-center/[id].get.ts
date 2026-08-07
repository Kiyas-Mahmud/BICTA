import { eq, asc } from 'drizzle-orm'
import { useDb, schema } from '../../../database/client'
import { idParam } from '../../../utils/validation'

// One team's preliminary submission, for the review page. Everything needed to
// judge it and decide, in a single request: the answers, who submitted them,
// and whether this competition holds results back to an announcement date.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = idParam.parse(getRouterParam(event, 'id'))
  const db = useDb()

  const registration = await db.select().from(schema.registrations).where(eq(schema.registrations.id, id)).get()
  if (!registration) throw createError({ statusCode: 404, statusMessage: 'Registration not found' })

  const comp = await db.select().from(schema.competitions).where(eq(schema.competitions.id, registration.competitionId)).get()
  const ev = comp ? await db.select().from(schema.events).where(eq(schema.events.id, comp.eventId)).get() : null

  const [fields, responses, roster] = await Promise.all([
    db
      .select()
      .from(schema.applicationFields)
      .where(eq(schema.applicationFields.competitionId, registration.competitionId))
      .orderBy(asc(schema.applicationFields.sortOrder)),
    db.select().from(schema.applicationResponses).where(eq(schema.applicationResponses.registrationId, id)),
    db
      .select({
        role: schema.teamMembers.role,
        fullName: schema.participantAccounts.fullName,
        email: schema.participantAccounts.email,
        status: schema.participantAccounts.status,
      })
      .from(schema.teamMembers)
      .innerJoin(schema.participantAccounts, eq(schema.participantAccounts.id, schema.teamMembers.accountId))
      .where(eq(schema.teamMembers.registrationId, id)),
  ])

  const byField = new Map(responses.map((r) => [r.fieldId, r]))

  return {
    team: {
      id: registration.id,
      teamName: registration.teamName,
      fullName: registration.fullName,
      email: registration.email,
      phone: registration.phone,
      institution: registration.institution,
      notes: registration.notes,
      status: registration.status,
      decisionNote: registration.decisionNote,
      decisionAt: registration.decisionAt,
      decisionNotifiedAt: registration.decisionNotifiedAt,
      createdAt: registration.createdAt,
    },
    competition: {
      id: comp?.id ?? null,
      name: comp?.name ?? '',
      eventTitle: ev?.title ?? '',
      resultsAnnounceAt: comp?.resultsAnnounceAt ?? null,
    },
    roster,
    answers: fields.map((f) => {
      const r = byField.get(f.id)
      return {
        fieldId: f.id,
        label: f.label,
        helpText: f.helpText,
        fieldType: f.fieldType,
        required: f.required,
        textValue: r?.textValue ?? null,
        fileUrl: r?.fileUrl ?? null,
        fileName: r?.fileName ?? null,
        updatedAt: r?.updatedAt ?? null,
      }
    }),
  }
})
