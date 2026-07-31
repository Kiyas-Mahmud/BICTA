import { z } from 'zod'
import { asc, eq, inArray } from 'drizzle-orm'
import { useDb, schema } from '../../../database/client'

const eventQuery = z.object({ eventId: z.coerce.number().int().positive().optional() })

// People are reusable across editions, so "belongs to an event" means assigned
// to judge one of that event's competitions.
//
// Left-joins judgeAccounts so the admin list can show each judge's portal
// invite status without an N+1 fetch per row. judgeStatus is null for
// speakers (no login concept) and for judges who have never been invited.
const columns = {
  id: schema.people.id,
  name: schema.people.name,
  title: schema.people.title,
  organization: schema.people.organization,
  photoUrl: schema.people.photoUrl,
  bio: schema.people.bio,
  role: schema.people.role,
  socialUrl: schema.people.socialUrl,
  email: schema.people.email,
  phone: schema.people.phone,
  expertise: schema.people.expertise,
  sortOrder: schema.people.sortOrder,
  judgeStatus: schema.judgeAccounts.status,
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { eventId } = await getValidatedQuery(event, eventQuery.parse)
  const db = useDb()

  if (!eventId) {
    return db
      .select(columns)
      .from(schema.people)
      .leftJoin(schema.judgeAccounts, eq(schema.judgeAccounts.personId, schema.people.id))
      .orderBy(asc(schema.people.sortOrder))
  }

  const assigned = await db
    .select({ personId: schema.judgeAssignments.personId })
    .from(schema.judgeAssignments)
    .innerJoin(schema.competitions, eq(schema.competitions.id, schema.judgeAssignments.competitionId))
    .where(eq(schema.competitions.eventId, eventId))

  const ids = [...new Set(assigned.map((a) => a.personId))]
  if (!ids.length) return []

  return db
    .select(columns)
    .from(schema.people)
    .leftJoin(schema.judgeAccounts, eq(schema.judgeAccounts.personId, schema.people.id))
    .where(inArray(schema.people.id, ids))
    .orderBy(asc(schema.people.sortOrder))
})
