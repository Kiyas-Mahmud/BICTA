import { z } from 'zod'
import { and, desc, eq, inArray, isNotNull, or } from 'drizzle-orm'
import { useDb, schema } from '../../../database/client'
import { pendingAnnouncementCount, releaseDueDecisions } from '../../../utils/decisions'

// Review queue for preliminary submissions.
//
// Only teams that actually submitted something appear here — a registration
// with no answers has nothing to review, and would only pad the list. The
// competition filter is likewise limited to competitions that define an
// application form, since those are the only ones with a submission to judge.
const query = z.object({
  eventId: z.coerce.number().int().positive().optional(),
  competitionId: z.coerce.number().int().positive().optional(),
  status: z.enum(['all', 'pending', 'confirmed', 'rejected']).default('all'),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { eventId, competitionId, status } = await getValidatedQuery(event, query.parse)
  const db = useDb()

  // Competitions that ask for a preliminary submission, i.e. have at least one
  // application field. These populate the filter and bound everything below.
  const withForms = await db
    .selectDistinct({
      id: schema.competitions.id,
      name: schema.competitions.name,
      eventId: schema.events.id,
      eventTitle: schema.events.title,
      resultsAnnounceAt: schema.competitions.resultsAnnounceAt,
    })
    .from(schema.applicationFields)
    .innerJoin(schema.competitions, eq(schema.competitions.id, schema.applicationFields.competitionId))
    .innerJoin(schema.events, eq(schema.events.id, schema.competitions.eventId))

  const scopedCompetitions = withForms.filter(
    (c) => (!eventId || c.eventId === eventId) && (!competitionId || c.id === competitionId),
  )
  const compIds = scopedCompetitions.map((c) => c.id)

  if (!compIds.length) {
    return {
      competitions: withForms,
      events: dedupeEvents(withForms),
      selected: null,
      awaitingAnnouncement: 0,
      teams: [],
      counts: { all: 0, pending: 0, confirmed: 0, rejected: 0 },
    }
  }

  // Opening the centre is a natural moment to flush any announcement whose
  // date has arrived, so results are never stranded if a cron run is missed.
  if (competitionId) await releaseDueDecisions(competitionId)

  // Submitted = has at least one answer row carrying a value.
  const submittedRows = await db
    .selectDistinct({ registrationId: schema.applicationResponses.registrationId })
    .from(schema.applicationResponses)
    .where(or(isNotNull(schema.applicationResponses.textValue), isNotNull(schema.applicationResponses.fileUrl)))
  const submittedIds = submittedRows.map((r) => r.registrationId)
  if (!submittedIds.length) {
    return {
      competitions: withForms,
      events: dedupeEvents(withForms),
      selected: competitionId ? (scopedCompetitions[0] ?? null) : null,
      awaitingAnnouncement: 0,
      teams: [],
      counts: { all: 0, pending: 0, confirmed: 0, rejected: 0 },
    }
  }

  const registrations = await db
    .select({
      id: schema.registrations.id,
      teamName: schema.registrations.teamName,
      fullName: schema.registrations.fullName,
      email: schema.registrations.email,
      institution: schema.registrations.institution,
      status: schema.registrations.status,
      decisionNotifiedAt: schema.registrations.decisionNotifiedAt,
      createdAt: schema.registrations.createdAt,
      competitionId: schema.registrations.competitionId,
      competitionName: schema.competitions.name,
      eventTitle: schema.events.title,
    })
    .from(schema.registrations)
    .innerJoin(schema.competitions, eq(schema.competitions.id, schema.registrations.competitionId))
    .innerJoin(schema.events, eq(schema.events.id, schema.competitions.eventId))
    .where(and(inArray(schema.registrations.competitionId, compIds), inArray(schema.registrations.id, submittedIds)))
    .orderBy(desc(schema.registrations.createdAt))

  // Counts describe the whole scope, so the tabs keep their numbers when one
  // of them is selected.
  const counts = {
    all: registrations.length,
    pending: registrations.filter((r) => r.status === 'pending').length,
    confirmed: registrations.filter((r) => r.status === 'confirmed').length,
    rejected: registrations.filter((r) => r.status === 'rejected').length,
  }

  const ids = registrations.map((r) => r.id)
  const [fields, answers, roster] = await Promise.all([
    db.select().from(schema.applicationFields).where(inArray(schema.applicationFields.competitionId, compIds)),
    db.select().from(schema.applicationResponses).where(inArray(schema.applicationResponses.registrationId, ids)),
    db
      .select({ registrationId: schema.teamMembers.registrationId })
      .from(schema.teamMembers)
      .where(inArray(schema.teamMembers.registrationId, ids)),
  ])

  const requiredByComp = new Map<number, number[]>()
  for (const f of fields) {
    if (!f.required) continue
    requiredByComp.set(f.competitionId, [...(requiredByComp.get(f.competitionId) ?? []), f.id])
  }
  const answered = new Set(
    answers.filter((a) => a.textValue || a.fileUrl).map((a) => `${a.registrationId}:${a.fieldId}`),
  )
  const sizeBy = new Map<number, number>()
  for (const m of roster) sizeBy.set(m.registrationId, (sizeBy.get(m.registrationId) ?? 0) + 1)

  return {
    competitions: withForms,
    events: dedupeEvents(withForms),
    selected: competitionId ? (scopedCompetitions[0] ?? null) : null,
    awaitingAnnouncement: competitionId ? await pendingAnnouncementCount(competitionId) : 0,
    counts,
    teams: registrations
      .filter((r) => status === 'all' || r.status === status)
      .map((r) => ({
        id: r.id,
        teamName: r.teamName,
        fullName: r.fullName,
        email: r.email,
        institution: r.institution,
        status: r.status,
        decisionNotifiedAt: r.decisionNotifiedAt,
        createdAt: r.createdAt,
        competitionName: r.competitionName,
        eventTitle: r.eventTitle,
        teamSize: sizeBy.get(r.id) ?? 1,
        missingRequired: (requiredByComp.get(r.competitionId) ?? []).filter((fid) => !answered.has(`${r.id}:${fid}`)).length,
      })),
  }
})

function dedupeEvents(rows: { eventId: number; eventTitle: string }[]) {
  const seen = new Map<number, string>()
  for (const r of rows) seen.set(r.eventId, r.eventTitle)
  return [...seen].map(([id, title]) => ({ id, title }))
}
