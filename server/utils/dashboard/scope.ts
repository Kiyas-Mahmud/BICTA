import { and, countDistinct, count, eq, ne, sql } from 'drizzle-orm'
import { useDb, schema } from '../../database/client'

// Canonical scoping predicates for every event-scoped metric.
//
// This file exists because the codebase shipped THREE different definitions
// under two names — `getEventStats` counted team_members rows (a person in two
// competitions counted twice), `getEventDetail` counted distinct accounts with
// no status filter (rejected teams inflated it), and stats.get.ts counted
// registrations with a non-empty teamName (which silently dropped every solo
// entry, since registrations.post.ts writes teamName: null for those).
//
// The fix is not to pick a winner and hope the others stay in line: it is to
// export the PREDICATES, make the ambiguous names unavailable, and have every
// call site go through eventHeadcount() so the definition exists once.

/** Rejected teams are not attending; they never count toward headcount. */
export const NOT_REJECTED = ne(schema.registrations.status, 'rejected')

/**
 * Scope by joining to competitions, NOT by an inArray of competition ids.
 * D1 caps bound parameters at 100, so an id list is a latent ceiling on any
 * event with many competitions — and it costs an extra dependent round trip.
 */
export const eventScope = (eventId: number) => eq(schema.competitions.eventId, eventId)

export interface EventHeadcount {
  /** Distinct humans. One badge, one lunch. The headline "Participants". */
  people: number
  /**
   * Roster seats. The ONLY correct denominator for check-in and collection
   * maths, because the QR is per-membership (0015_per_competition_qr.sql) —
   * a two-track person legitimately collects two kits. Using `people` there
   * would produce cells over 100%.
   */
  participations: number
  /** Distinct institutions, case- and whitespace-normalised. */
  institutions: number
}

/**
 * The one place headcount is defined. `getEventStats` and `getEventDetail`
 * both delegate here so the public site and the admin dashboard cannot drift.
 */
export async function eventHeadcount(eventId: number): Promise<EventHeadcount> {
  const db = useDb()

  const roster = db
    .select({
      people: countDistinct(schema.teamMembers.accountId),
      participations: count(schema.teamMembers.id),
    })
    .from(schema.teamMembers)
    .innerJoin(schema.registrations, eq(schema.registrations.id, schema.teamMembers.registrationId))
    .innerJoin(schema.competitions, eq(schema.competitions.id, schema.registrations.competitionId))
    .where(and(eventScope(eventId), NOT_REJECTED))

  // lower(trim()) matters: the previous countDistinct was case- and
  // whitespace-sensitive, so "BUET", "buet" and "BUET " counted as three.
  const institutions = db
    .select({ n: countDistinct(sql`lower(trim(${schema.registrations.institution}))`) })
    .from(schema.registrations)
    .innerJoin(schema.competitions, eq(schema.competitions.id, schema.registrations.competitionId))
    .where(and(eventScope(eventId), NOT_REJECTED, ne(schema.registrations.institution, '')))

  const [rosterRows, instRows] = await db.batch([roster, institutions])

  return {
    people: rosterRows[0]?.people ?? 0,
    participations: rosterRows[0]?.participations ?? 0,
    institutions: instRows[0]?.n ?? 0,
  }
}
