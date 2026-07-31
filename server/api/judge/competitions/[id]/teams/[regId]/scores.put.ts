import { eq, and } from 'drizzle-orm'
import { useDb, schema } from '../../../../../../database/client'
import { assignedCompetitionIds } from '../../../../../../utils/judgeScope'
import { getScoringCriteria } from '../../../../../../utils/queries'
import { idParam, judgeScoreBatchSchema } from '../../../../../../utils/validation'

// Saves every criterion for one team in a single call: the write endpoint
// batches by design so a partial save is atomic, and a judge reviewing several
// ratings together before committing doesn't need N separate requests.
export default defineEventHandler(async (event) => {
  const judge = await requireJudge(event)
  const competitionId = idParam.parse(getRouterParam(event, 'id'))
  const registrationId = idParam.parse(getRouterParam(event, 'regId'))
  const body = await readValidatedBody(event, judgeScoreBatchSchema.parse)
  const db = useDb()

  const allowed = await assignedCompetitionIds(judge.id)
  if (!allowed.includes(competitionId)) {
    throw createError({ statusCode: 403, statusMessage: 'You are not assigned to judge this competition.' })
  }

  const comp = await db.select({ judgingOpen: schema.competitions.judgingOpen }).from(schema.competitions).where(eq(schema.competitions.id, competitionId)).get()
  if (!comp) throw createError({ statusCode: 404, statusMessage: 'Competition not found' })
  if (!comp.judgingOpen) {
    throw createError({ statusCode: 403, statusMessage: 'Judging is closed for this competition.' })
  }

  const registration = await db.select().from(schema.registrations).where(eq(schema.registrations.id, registrationId)).get()
  if (!registration || registration.competitionId !== competitionId || registration.status !== 'confirmed') {
    throw createError({ statusCode: 404, statusMessage: 'This team is not open for judging.' })
  }

  const criteria = await getScoringCriteria(competitionId)
  const criteriaIds = new Set(criteria.map((c) => c.id))
  for (const entry of body) {
    if (!criteriaIds.has(entry.criterionId)) {
      throw createError({ statusCode: 400, statusMessage: 'One of the submitted criteria does not belong to this competition.' })
    }
  }

  const statements = body.map((entry) =>
    db
      .insert(schema.scores)
      .values({
        registrationId,
        competitionId,
        criterionId: entry.criterionId,
        judgeId: judge.id,
        value: entry.value,
        note: entry.note ?? null,
      })
      .onConflictDoUpdate({
        target: [schema.scores.registrationId, schema.scores.criterionId, schema.scores.judgeId],
        set: { value: entry.value, note: entry.note ?? null, updatedAt: new Date().toISOString() },
      }),
  )
  await db.batch(statements as [(typeof statements)[number], ...(typeof statements)[number][]])

  const rows = await db
    .select()
    .from(schema.scores)
    .where(and(eq(schema.scores.registrationId, registrationId), eq(schema.scores.judgeId, judge.id)))

  return {
    scores: Object.fromEntries(rows.map((r) => [r.criterionId, { value: r.value, note: r.note }])),
    complete: criteria.length > 0 && rows.length === criteria.length,
  }
})
