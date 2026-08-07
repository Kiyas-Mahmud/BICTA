import { and, eq, inArray, isNull, isNotNull, lte, or } from 'drizzle-orm'
import { useDb, schema } from '../database/client'
import { sendMail, applicationConfirmedEmail, applicationRejectedEmail } from './email'

// Preliminary selection results.
//
// A decision (confirmed/rejected) and the email announcing it are deliberately
// two separate moments. Reviewers work through applications over days; the
// competition's resultsAnnounceAt holds every message back so all teams learn
// at the same time. Null means "no embargo" — mail goes out with the decision,
// which is the behaviour that existed before this feature.
//
// registrations.decisionNotifiedAt is the sent-marker, so a team can never be
// emailed the same result twice however many times the sweep runs.

/** Is the embargo lifted for this competition right now? */
export function announcementDue(resultsAnnounceAt: string | null | undefined, now = new Date()): boolean {
  if (!resultsAnnounceAt) return true
  return new Date(`${resultsAnnounceAt}T00:00:00Z`) <= now
}

type DecidedRegistration = {
  id: number
  email: string
  fullName: string
  teamName: string | null
  status: string
  decisionNote: string | null
}

/** Send one decision email and stamp it as notified. */
export async function sendDecisionMail(registration: DecidedRegistration, competitionName: string): Promise<void> {
  if (registration.status !== 'confirmed' && registration.status !== 'rejected') return

  const opts = {
    name: registration.fullName,
    teamName: registration.teamName ?? '',
    competition: competitionName,
    note: registration.decisionNote,
  }
  const mail = registration.status === 'confirmed' ? applicationConfirmedEmail(opts) : applicationRejectedEmail(opts)
  await sendMail({ to: registration.email, ...mail }).catch(() => {})

  await useDb()
    .update(schema.registrations)
    .set({ decisionNotifiedAt: new Date().toISOString() })
    .where(eq(schema.registrations.id, registration.id))
}

/**
 * Send every decision whose embargo has lifted and which has not been mailed
 * yet. Idempotent, so it is safe to call from a cron trigger, from the
 * Application Center on load, and from an explicit "announce now" button.
 *
 * `competitionId` limits the sweep to one competition (the manual button);
 * omit it to sweep everything (the scheduled run).
 */
export async function releaseDueDecisions(competitionId?: number): Promise<number> {
  const db = useDb()
  const today = new Date().toISOString().slice(0, 10)

  const rows = await db
    .select({
      id: schema.registrations.id,
      email: schema.registrations.email,
      fullName: schema.registrations.fullName,
      teamName: schema.registrations.teamName,
      status: schema.registrations.status,
      decisionNote: schema.registrations.decisionNote,
      competitionName: schema.competitions.name,
    })
    .from(schema.registrations)
    .innerJoin(schema.competitions, eq(schema.competitions.id, schema.registrations.competitionId))
    .where(
      and(
        competitionId ? eq(schema.registrations.competitionId, competitionId) : undefined,
        inArray(schema.registrations.status, ['confirmed', 'rejected']),
        isNull(schema.registrations.decisionNotifiedAt),
        // No embargo, or one that has already passed. Dates are plain
        // YYYY-MM-DD, so a string compare is the same as a date compare.
        or(isNull(schema.competitions.resultsAnnounceAt), lte(schema.competitions.resultsAnnounceAt, today)),
      ),
    )

  for (const row of rows) {
    await sendDecisionMail(row, row.competitionName)
  }
  return rows.length
}

/** How many decisions are waiting on an embargo, for the admin UI. */
export async function pendingAnnouncementCount(competitionId: number): Promise<number> {
  const rows = await useDb()
    .select({ id: schema.registrations.id })
    .from(schema.registrations)
    .where(
      and(
        eq(schema.registrations.competitionId, competitionId),
        inArray(schema.registrations.status, ['confirmed', 'rejected']),
        isNull(schema.registrations.decisionNotifiedAt),
      ),
    )
  return rows.length
}
