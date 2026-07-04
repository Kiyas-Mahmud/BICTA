import { eq, and, ne } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { useDb, schema } from '../database/client'

// Shared guard for leader-only roster mutations: the caller must be the
// leader of this registration AND the competition's registration deadline
// must not have passed. Everything server-side; UI hiding is not security.
export async function requireTeamLeader(event: H3Event, registrationId: number) {
  const me = await requireParticipant(event)
  const db = useDb()

  const membership = db
    .select()
    .from(schema.teamMembers)
    .where(and(eq(schema.teamMembers.registrationId, registrationId), eq(schema.teamMembers.accountId, me.id)))
    .get()
  if (!membership || membership.role !== 'leader') {
    throw createError({ statusCode: 403, statusMessage: 'Only the team leader can manage the team.' })
  }

  const registration = db.select().from(schema.registrations).where(eq(schema.registrations.id, registrationId)).get()
  if (!registration) throw createError({ statusCode: 404, statusMessage: 'Team not found' })

  const comp = db.select().from(schema.competitions).where(eq(schema.competitions.id, registration.competitionId)).get()
  if (!comp) throw createError({ statusCode: 404, statusMessage: 'Competition not found' })

  if (comp.registrationDeadline && new Date(`${comp.registrationDeadline}T23:59:59Z`) < new Date()) {
    throw createError({ statusCode: 403, statusMessage: 'The registration deadline has passed; the team is locked.' })
  }

  return { me, registration, comp }
}

// Keep the legacy registrations.team_members JSON in sync with the
// team_members table (admin CSV export and old views still read it).
export async function syncLegacyRoster(registrationId: number) {
  const db = useDb()
  const roster = await db
    .select({ name: schema.participantAccounts.fullName, email: schema.participantAccounts.email })
    .from(schema.teamMembers)
    .innerJoin(schema.participantAccounts, eq(schema.participantAccounts.id, schema.teamMembers.accountId))
    .where(and(eq(schema.teamMembers.registrationId, registrationId), ne(schema.teamMembers.role, 'leader')))
  await db
    .update(schema.registrations)
    .set({ teamMembers: roster.length ? roster : null })
    .where(eq(schema.registrations.id, registrationId))
}
