import { asc, eq } from 'drizzle-orm'
import { useDb, schema } from '../../../../database/client'
import { idParam } from '../../../../utils/validation'
import { applicationWindow } from '../../../../utils/application'

// No auth — this feeds the public registration form. Only fetched by pages
// that need it (register.vue), kept separate from the globally-prefetched
// competitions list.
export default defineEventHandler(async (event) => {
  const competitionId = idParam.parse(getRouterParam(event, 'id'))
  const db = useDb()

  const [comp, fields] = await Promise.all([
    db
      .select({
        applicationRequired: schema.competitions.applicationRequired,
        applicationOpensAt: schema.competitions.applicationOpensAt,
        applicationClosesAt: schema.competitions.applicationClosesAt,
        registrationDeadline: schema.competitions.registrationDeadline,
      })
      .from(schema.competitions)
      .where(eq(schema.competitions.id, competitionId))
      .get(),
    db
      .select({
        id: schema.applicationFields.id,
        label: schema.applicationFields.label,
        helpText: schema.applicationFields.helpText,
        fieldType: schema.applicationFields.fieldType,
        required: schema.applicationFields.required,
        sortOrder: schema.applicationFields.sortOrder,
      })
      .from(schema.applicationFields)
      .where(eq(schema.applicationFields.competitionId, competitionId))
      .orderBy(asc(schema.applicationFields.sortOrder)),
  ])

  const window = comp ? applicationWindow(comp) : { state: 'open' as const, opensAt: null, closesAt: null }
  return {
    fields,
    window,
    // Mirrors the server rule in /api/registrations: a field's own required
    // flag only blocks registration while this is true.
    required: Boolean(comp?.applicationRequired) && window.state === 'open',
  }
})
