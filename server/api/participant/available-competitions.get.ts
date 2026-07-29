import { and, asc, eq, ne, notInArray } from 'drizzle-orm'
import { useDb, schema } from '../../database/client'

// Competitions the signed-in participant can still enter: registration open,
// deadline not passed, parent event not finished, and they are not already on
// a team for it (one team per competition).
export default defineEventHandler(async (event) => {
  const me = await requireParticipant(event)
  const db = useDb()

  const joined = await db
    .select({ competitionId: schema.teamMembers.competitionId })
    .from(schema.teamMembers)
    .where(eq(schema.teamMembers.accountId, me.id))
  const joinedIds = joined.map((j) => j.competitionId)

  const rows = await db
    .select({
      id: schema.competitions.id,
      name: schema.competitions.name,
      type: schema.competitions.type,
      teamBased: schema.competitions.teamBased,
      maxTeamSize: schema.competitions.maxTeamSize,
      registrationDeadline: schema.competitions.registrationDeadline,
      coverImage: schema.competitions.coverImage,
      eventId: schema.events.id,
      eventTitle: schema.events.title,
      eventVenue: schema.events.venue,
    })
    .from(schema.competitions)
    .innerJoin(schema.events, eq(schema.events.id, schema.competitions.eventId))
    .where(
      and(
        eq(schema.competitions.registrationOpen, true),
        ne(schema.events.status, 'past'),
        joinedIds.length ? notInArray(schema.competitions.id, joinedIds) : undefined,
      ),
    )
    .orderBy(asc(schema.competitions.sortOrder))

  // Deadline is a plain date string, so filter it here rather than in SQL.
  const today = new Date()
  return rows.filter(
    (r) => !r.registrationDeadline || new Date(`${r.registrationDeadline}T23:59:59Z`) >= today,
  )
})
