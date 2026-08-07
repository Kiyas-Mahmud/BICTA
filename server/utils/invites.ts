import { and, eq, inArray, isNotNull, lt, ne } from 'drizzle-orm'
import { useDb, schema } from '../database/client'
import { syncLegacyRoster } from './team'

// A seat is only ever *reserved* by an invite. Nobody counts as registered
// until they have set a password (account status 'active'), and an invite that
// is never accepted within this window is released so the address is free to
// register or be invited again.
export const INVITE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

/**
 * Release seats held by invites that expired without ever being accepted, for
 * the given addresses. Safe to call before any uniqueness check: afterwards,
 * every remaining team_members row belongs to someone who either completed
 * setup or still has a live invite, so the existing one-team-per-competition
 * and duplicate-registration checks stay exactly as they were.
 *
 * Returns the file URLs of any application answers it removed, so the caller
 * can best-effort delete those objects from R2 (D1 cascades cannot).
 */
export async function releaseExpiredInvites(emails: string[]): Promise<string[]> {
  if (!emails.length) return []
  const db = useDb()
  const now = new Date().toISOString()

  // Never activated, and the window has closed. A null inviteExpires predates
  // this rule and means "no deadline" — not "already expired".
  const stale = await db
    .select({ id: schema.participantAccounts.id })
    .from(schema.participantAccounts)
    .where(
      and(
        inArray(schema.participantAccounts.email, emails),
        ne(schema.participantAccounts.status, 'active'),
        isNotNull(schema.participantAccounts.inviteExpires),
        lt(schema.participantAccounts.inviteExpires, now),
      ),
    )
  if (!stale.length) return []
  const staleIds = stale.map((a) => a.id)

  const seats = await db
    .select({
      registrationId: schema.teamMembers.registrationId,
      role: schema.teamMembers.role,
    })
    .from(schema.teamMembers)
    .where(inArray(schema.teamMembers.accountId, staleIds))

  // A team whose leader never activated is an abandoned entry: the whole
  // registration goes, taking its roster and application answers with it.
  const ledIds = [...new Set(seats.filter((s) => s.role === 'leader').map((s) => s.registrationId))]
  // Teams that merely lose a teammate survive, but their denormalised roster
  // JSON has to be re-synced afterwards.
  const touchedIds = [...new Set(seats.map((s) => s.registrationId))].filter((id) => !ledIds.includes(id))

  let files: string[] = []
  if (ledIds.length) {
    const answers = await db
      .select({ fileUrl: schema.applicationResponses.fileUrl })
      .from(schema.applicationResponses)
      .where(inArray(schema.applicationResponses.registrationId, ledIds))
    files = answers.map((a) => a.fileUrl).filter((url): url is string => Boolean(url))

    // Children first, explicitly: correct regardless of whether foreign-key
    // cascades are enforced on the connection.
    await db.delete(schema.applicationResponses).where(inArray(schema.applicationResponses.registrationId, ledIds))
    await db.delete(schema.teamMembers).where(inArray(schema.teamMembers.registrationId, ledIds))
    await db.delete(schema.registrations).where(inArray(schema.registrations.id, ledIds))
  }

  // Seats they only held as a teammate on somebody else's surviving team.
  await db.delete(schema.teamMembers).where(inArray(schema.teamMembers.accountId, staleIds))
  for (const id of touchedIds) await syncLegacyRoster(id)

  // The account row itself stays. Without a password it grants no access, and
  // recycling it keeps the person's checkinToken stable if they come back —
  // the uniqueness that blocked them lived in team_members/registrations,
  // both of which are now clear.
  return files
}
