import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../../database/client'
import { competitionSchema } from '../../../utils/validation'
import { slugify, uniqueSlug } from '../../../utils/slug'
import { sanitizeRichText } from '../../../utils/sanitize'
import { recordAudit } from '../../../utils/audit'

export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const body = await readValidatedBody(event, competitionSchema.parse)
  const db = useDb()

  const parent = await db.select({ id: schema.events.id }).from(schema.events).where(eq(schema.events.id, body.eventId)).get()
  if (!parent) throw createError({ statusCode: 400, statusMessage: 'Event does not exist' })

  const base = slugify(body.slug || body.name)
  const slug = await uniqueSlug(
    base,
    async (s) => !!(await db.select({ id: schema.competitions.id }).from(schema.competitions).where(eq(schema.competitions.slug, s)).get()),
  )

  // Sequential, not batched: the prize rows need the competition id that only
  // exists after the insert returns (D1 has no interactive transactions).
  const [comp] = await db
    .insert(schema.competitions)
    .values({
      eventId: body.eventId,
      name: body.name,
      slug,
      type: body.type,
      description: sanitizeRichText(body.description),
      rules: sanitizeRichText(body.rules),
      registrationOpen: body.registrationOpen,
      registrationDeadline: body.registrationDeadline ?? null,
      startsAt: body.startsAt ?? null,
      endsAt: body.endsAt ?? null,
      judgingOpen: body.judgingOpen,
      teamBased: body.teamBased,
      maxTeamSize: body.maxTeamSize,
      coverImage: body.coverImage || null,
      bannerImage: body.bannerImage || null,
      category: body.category,
      difficulty: body.difficulty,
      submissionGuidelines: sanitizeRichText(body.submissionGuidelines),
      evaluationCriteria: sanitizeRichText(body.evaluationCriteria),
      resources: sanitizeRichText(body.resources),
      sortOrder: body.sortOrder,
    })
    .returning()

  if (body.prizes.length > 0) {
    await db
      .insert(schema.prizes)
      .values(body.prizes.map((p, i) => ({ competitionId: comp!.id, position: p.position, amount: p.amount, note: p.note ?? null, sortOrder: i })))
  }

  await recordAudit(actor, { action: 'create', entity: 'competition', entityId: comp!.id, summary: `Created competition "${comp!.name}"` })
  return comp!
})
