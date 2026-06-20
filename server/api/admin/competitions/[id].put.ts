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

  const existing = db.select({ id: schema.competitions.id }).from(schema.competitions).where(eq(schema.competitions.id, id)).get()
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Competition not found' })

  const base = slugify(body.slug || body.name)
  const slug = uniqueSlug(
    base,
    (s) =>
      !!db
        .select({ id: schema.competitions.id })
        .from(schema.competitions)
        .where(and(eq(schema.competitions.slug, s), ne(schema.competitions.id, id)))
        .get(),
  )

  const row = db.transaction((tx) => {
    const [comp] = tx
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
      .returning()
      .all()

    // Prizes are replaced wholesale with the submitted list.
    tx.delete(schema.prizes).where(eq(schema.prizes.competitionId, id)).run()
    if (body.prizes.length > 0) {
      tx.insert(schema.prizes)
        .values(body.prizes.map((p, i) => ({ competitionId: id, position: p.position, amount: p.amount, note: p.note ?? null, sortOrder: i })))
        .run()
    }
    return comp!
  })

  return row
})
