import { asc, eq, inArray } from 'drizzle-orm'
import { useDb, schema } from '../../database/client'
import { allowedCompetitionIds } from '../../utils/volunteerScope'

// What this staff member is assigned to, for the scanner header. Admins are
// unscoped and get `scoped: false`.
export default defineEventHandler(async (event) => {
  const staff = await requireStaff(event)
  const db = useDb()

  const allowed = await allowedCompetitionIds(event, staff)
  if (!allowed) {
    return { scoped: false, event: null, competitions: [], checkpoints: [] }
  }

  const competitions = await db
    .select({ id: schema.competitions.id, name: schema.competitions.name, eventId: schema.competitions.eventId })
    .from(schema.competitions)
    .where(inArray(schema.competitions.id, allowed))
    .orderBy(asc(schema.competitions.sortOrder))

  const parentEvent = competitions.length
    ? await db.select({ id: schema.events.id, title: schema.events.title }).from(schema.events).where(eq(schema.events.id, competitions[0]!.eventId)).get()
    : null

  const staffed = await db
    .select({ checkpointId: schema.checkpointVolunteers.checkpointId })
    .from(schema.checkpointVolunteers)
    .where(eq(schema.checkpointVolunteers.adminId, staff.id))

  return {
    scoped: true,
    event: parentEvent ?? null,
    competitions,
    checkpoints: staffed.map((s) => s.checkpointId),
  }
})
