import { asc, eq } from 'drizzle-orm'
import { useDb, schema } from '../../../../database/client'
import { idParam } from '../../../../utils/validation'

// No auth — this feeds the public registration form. Only fetched by pages
// that need it (register.vue), kept separate from the globally-prefetched
// competitions list.
export default defineEventHandler(async (event) => {
  const competitionId = idParam.parse(getRouterParam(event, 'id'))
  return useDb()
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
    .orderBy(asc(schema.applicationFields.sortOrder))
})
