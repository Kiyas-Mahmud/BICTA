import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../../database/client'
import { competitionSchema } from '../../../utils/validation'
import { slugify, uniqueSlug } from '../../../utils/slug'
import { sanitizeRichText } from '../../../utils/sanitize'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readValidatedBody(event, competitionSchema.parse)
  const db = useDb()

  const parent = db.select({ id: schema.events.id }).from(schema.events).where(eq(schema.events.id, body.eventId)).get()
  if (!parent) throw createError({ statusCode: 400, statusMessage: 'Event does not exist' })

  const base = slugify(body.slug || body.name)
  const slug = uniqueSlug(
    base,
    (s) => !!db.select({ id: schema.competitions.id }).from(schema.competitions).where(eq(schema.competitions.slug, s)).get(),
  )

  const row = db.transaction((tx) => {
    const [comp] = tx
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
        teamBased: body.teamBased,
        maxTeamSize: body.maxTeamSize,
        coverImage: body.coverImage || null,
        sortOrder: body.sortOrder,
      })
      .returning()
      .all()

    if (body.prizes.length > 0) {
      tx.insert(schema.prizes)
        .values(body.prizes.map((p, i) => ({ competitionId: comp!.id, position: p.position, amount: p.amount, note: p.note ?? null, sortOrder: i })))
        .run()
    }
    return comp!
  })

  return row
})
