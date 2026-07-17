import { count, desc, eq, gte, sql } from 'drizzle-orm'
import { useDb, schema } from '../../database/client'

// Dashboard analytics. All counts + a 14-day registration series, status
// breakdown, prize pool (money), top competitions and recent registrations.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const db = useDb()

  const [ev] = await db.select({ n: count() }).from(schema.events)
  const [comp] = await db.select({ n: count() }).from(schema.competitions)
  const [newsN] = await db.select({ n: count() }).from(schema.news)
  const [regN] = await db.select({ n: count() }).from(schema.registrations)
  const [partN] = await db.select({ n: count() }).from(schema.participantAccounts)
  const [activePartN] = await db
    .select({ n: count() })
    .from(schema.participantAccounts)
    .where(eq(schema.participantAccounts.status, 'active'))
  const [checkinN] = await db.select({ n: count() }).from(schema.checkins)
  const [checkpointN] = await db.select({ n: count() }).from(schema.checkpoints)
  const [subN] = await db.select({ n: count() }).from(schema.newsletterSubscribers)
  const [unreadN] = await db
    .select({ n: count() })
    .from(schema.contactMessages)
    .where(eq(schema.contactMessages.isRead, false))
  const [teamsN] = await db
    .select({ n: count() })
    .from(schema.registrations)
    .where(sql`${schema.registrations.teamName} is not null and ${schema.registrations.teamName} <> ''`)

  // Registration status breakdown.
  const statusRows = await db
    .select({ status: schema.registrations.status, n: count() })
    .from(schema.registrations)
    .groupBy(schema.registrations.status)
  const byStatus = { pending: 0, confirmed: 0, rejected: 0 }
  for (const r of statusRows) (byStatus as Record<string, number>)[r.status] = r.n

  // Prize pool (money): amounts are free-text like "$1,000" / "50000 BDT".
  const prizeRows = await db.select({ amount: schema.prizes.amount }).from(schema.prizes)
  const prizePool = prizeRows.reduce(
    (s, p) => s + (Number.parseInt(String(p.amount).replace(/[^\d]/g, ''), 10) || 0),
    0,
  )

  // Registrations per day over the last 14 days (UTC), zero-filled.
  const seriesRows = await db
    .select({ day: sql<string>`date(${schema.registrations.createdAt})`, n: count() })
    .from(schema.registrations)
    .where(gte(schema.registrations.createdAt, sql`datetime('now','-13 days')`))
    .groupBy(sql`date(${schema.registrations.createdAt})`)
  const seriesMap = new Map(seriesRows.map((r) => [r.day, r.n]))
  const series: { day: string; label: string; value: number }[] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - i)
    const key = d.toISOString().slice(0, 10)
    series.push({
      day: key,
      label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
      value: seriesMap.get(key) ?? 0,
    })
  }

  // Top competitions by registration volume.
  const topComps = await db
    .select({ name: schema.competitions.name, n: count(schema.registrations.id) })
    .from(schema.competitions)
    .leftJoin(schema.registrations, eq(schema.registrations.competitionId, schema.competitions.id))
    .groupBy(schema.competitions.id)
    .orderBy(sql`count(${schema.registrations.id}) desc`)
    .limit(5)

  // Most recent registrations for the activity feed.
  const recent = await db
    .select({
      id: schema.registrations.id,
      fullName: schema.registrations.fullName,
      email: schema.registrations.email,
      status: schema.registrations.status,
      createdAt: schema.registrations.createdAt,
      competitionName: schema.competitions.name,
    })
    .from(schema.registrations)
    .leftJoin(schema.competitions, eq(schema.competitions.id, schema.registrations.competitionId))
    .orderBy(desc(schema.registrations.createdAt))
    .limit(6)

  const [currentEvent] = await db
    .select({ id: schema.events.id, title: schema.events.title, year: schema.events.year })
    .from(schema.events)
    .where(eq(schema.events.isCurrent, true))
    .limit(1)

  return {
    events: ev?.n ?? 0,
    competitions: comp?.n ?? 0,
    news: newsN?.n ?? 0,
    registrations: regN?.n ?? 0,
    participants: partN?.n ?? 0,
    activeParticipants: activePartN?.n ?? 0,
    teams: teamsN?.n ?? 0,
    checkins: checkinN?.n ?? 0,
    checkpoints: checkpointN?.n ?? 0,
    subscribers: subN?.n ?? 0,
    unreadMessages: unreadN?.n ?? 0,
    pendingRegistrations: byStatus.pending,
    byStatus,
    prizePool,
    series,
    topComps,
    recent,
    currentEvent: currentEvent ?? null,
  }
})
