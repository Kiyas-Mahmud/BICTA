import { eq, and, ne } from 'drizzle-orm'
import { useDb, schema } from '../../../database/client'
import { competitionSchema, idParam } from '../../../utils/validation'
import { slugify, uniqueSlug } from '../../../utils/slug'
import { sanitizeRichText } from '../../../utils/sanitize'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = idParam.parse(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, competitionSchema.parse)
  const db = useDb()

  const existing = await db.select({ id: schema.competitions.id }).from(schema.competitions).where(eq(schema.competitions.id, id)).get()
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Competition not found' })

  const base = slugify(body.slug || body.name)
  const slug = await uniqueSlug(
    base,
    async (s) =>
      !!(await db
        .select({ id: schema.competitions.id })
        .from(schema.competitions)
        .where(and(eq(schema.competitions.slug, s), ne(schema.competitions.id, id)))
        .get()),
  )

  // D1 batch = one transaction. The competition id is known up front, so the
  // update and the wholesale prize replacement stay atomic.
  const statements = [
    db
      .update(schema.competitions)
      .set({
        eventId: body.eventId,
        name: body.name,
        slug,
        type: body.type,
        description: sanitizeRichText(body.description),
        rules: sanitizeRichText(body.rules),
        registrationOpen: body.registrationOpen,
        registrationDeadline: body.registrationDeadline ?? null,
        teamBased: body.teamBased,
        maxTeamSize: body.maxTeamSize,
        coverImage: body.coverImage || null,
        sortOrder: body.sortOrder,
      })
      .where(eq(schema.competitions.id, id))
      .returning(),
    db.delete(schema.prizes).where(eq(schema.prizes.competitionId, id)),
  ]

  if (body.prizes.length > 0) {
    statements.push(
      db
        .insert(schema.prizes)
        .values(body.prizes.map((p, i) => ({ competitionId: id, position: p.position, amount: p.amount, note: p.note ?? null, sortOrder: i }))) as any,
    )
  }

  const [updated] = await db.batch(statements as [(typeof statements)[number], ...(typeof statements)[number][]])

  return (updated as any[])[0]
})
