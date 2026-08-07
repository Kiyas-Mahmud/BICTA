import { z } from 'zod'
import { and, desc, eq, like, or } from 'drizzle-orm'
import { useDb, schema } from '../../../database/client'

// Every person who has an account, with the teams they belong to. Distinct
// from /api/admin/registrations, which lists team *entries* — this lists
// people, so a leader in three competitions appears once.
const query = z.object({
  q: z.string().trim().max(120).optional(),
  status: z.enum(['all', 'active', 'invited']).default('all'),
  competitionId: z.coerce.number().int().positive().optional(),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { q, status, competitionId } = await getValidatedQuery(event, query.parse)
  const db = useDb()

  const accounts = await db
    .select({
      id: schema.participantAccounts.id,
      fullName: schema.participantAccounts.fullName,
      email: schema.participantAccounts.email,
      phone: schema.participantAccounts.phone,
      status: schema.participantAccounts.status,
      inviteExpires: schema.participantAccounts.inviteExpires,
      createdAt: schema.participantAccounts.createdAt,
    })
    .from(schema.participantAccounts)
    .where(
      and(
        // 'invited' covers both a live invite and an expired one; the UI
        // separates them using inviteExpires rather than a third status.
        status === 'all' ? undefined : status === 'active'
          ? eq(schema.participantAccounts.status, 'active')
          : eq(schema.participantAccounts.status, 'invited'),
        q
          ? or(
              like(schema.participantAccounts.fullName, `%${q}%`),
              like(schema.participantAccounts.email, `%${q}%`),
            )
          : undefined,
      ),
    )
    .orderBy(desc(schema.participantAccounts.id))

  // Memberships in one pass, then grouped in memory: one query beats N.
  const memberships = await db
    .select({
      accountId: schema.teamMembers.accountId,
      role: schema.teamMembers.role,
      registrationId: schema.teamMembers.registrationId,
      teamName: schema.registrations.teamName,
      registrationStatus: schema.registrations.status,
      institution: schema.registrations.institution,
      competitionId: schema.competitions.id,
      competitionName: schema.competitions.name,
      eventTitle: schema.events.title,
    })
    .from(schema.teamMembers)
    .innerJoin(schema.registrations, eq(schema.registrations.id, schema.teamMembers.registrationId))
    .innerJoin(schema.competitions, eq(schema.competitions.id, schema.teamMembers.competitionId))
    .innerJoin(schema.events, eq(schema.events.id, schema.competitions.eventId))

  const byAccount = new Map<number, typeof memberships>()
  for (const m of memberships) {
    const list = byAccount.get(m.accountId) ?? []
    list.push(m)
    byAccount.set(m.accountId, list)
  }

  const now = new Date()
  const rows = accounts.map((a) => {
    const teams = byAccount.get(a.id) ?? []
    return {
      ...a,
      // Institution is stored per registration, not on the account.
      institution: teams[0]?.institution ?? '',
      inviteExpired:
        a.status !== 'active' && Boolean(a.inviteExpires) && new Date(a.inviteExpires!) < now,
      teams: teams.map((t) => ({
        registrationId: t.registrationId,
        teamName: t.teamName,
        role: t.role,
        competitionId: t.competitionId,
        competitionName: t.competitionName,
        eventTitle: t.eventTitle,
        registrationStatus: t.registrationStatus,
      })),
    }
  })

  // Competition filter applies to memberships, so it has to run after grouping.
  const filtered = competitionId ? rows.filter((r) => r.teams.some((t) => t.competitionId === competitionId)) : rows

  return {
    rows: filtered,
    totals: {
      all: filtered.length,
      active: filtered.filter((r) => r.status === 'active').length,
      invited: filtered.filter((r) => r.status !== 'active' && !r.inviteExpired).length,
      expired: filtered.filter((r) => r.inviteExpired).length,
    },
  }
})
