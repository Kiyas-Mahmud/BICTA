// Pure folds: grouped DB rows -> payload sections. No database access here, so
// every rule below is testable on its own and — more importantly — can be
// shared verbatim with the screens that already implement it, instead of being
// re-derived slightly differently.

/**
 * Zero-fill a daily series. Lifted from stats.get.ts, which was correct; the
 * bug there was the WINDOW, not the fill (see dashboardTrendWindow below).
 */
export function zeroFill(
  rows: { day: string; n: number }[],
  from: Date,
  to: Date,
): { day: string; label: string; value: number }[] {
  const byDay = new Map(rows.map((r) => [r.day, r.n]))
  const out: { day: string; label: string; value: number }[] = []
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()))
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()))

  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10)
    out.push({
      day: key,
      label: cursor.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
      value: byDay.get(key) ?? 0,
    })
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return out
}

/**
 * Pick the trend window.
 *
 * stats.get.ts used `datetime('now','-13 days')`, which returns an EMPTY chart
 * for every event that is not currently taking registrations — i.e. most of
 * the switcher. Anchor to the event instead, and if that still finds nothing,
 * fall back to the last `days` that actually contain data and say so, rather
 * than rendering a flat line and implying no one signed up.
 */
export function dashboardTrendWindow(
  event: { endDate?: string | null },
  days: number,
  latestRegistrationDay: string | null,
  now: Date = new Date(),
): { from: Date; to: Date; windowShifted: boolean } {
  const eventEnd = event.endDate ? new Date(`${event.endDate}T23:59:59Z`) : null
  let to = eventEnd && eventEnd < now ? eventEnd : now
  let windowShifted = false

  const from = () => new Date(to.getTime() - (days - 1) * 86_400_000)

  // Nothing in the natural window but data exists elsewhere: re-anchor.
  if (latestRegistrationDay) {
    const latest = new Date(`${latestRegistrationDay}T23:59:59Z`)
    if (latest < from()) {
      to = latest
      windowShifted = true
    }
  }
  return { from: from(), to, windowShifted }
}

/**
 * Required-answer completeness, keyed `${registrationId}:${fieldId}`.
 *
 * This is the exact rule the Application Center uses. Both call sites import
 * it so "missing required" can never mean two different things.
 */
export function missingRequiredFold(
  registrations: { id: number; competitionId: number }[],
  requiredFields: { id: number; competitionId: number }[],
  answers: { registrationId: number; fieldId: number; textValue: string | null; fileUrl: string | null }[],
): Map<number, number> {
  const requiredByComp = new Map<number, number[]>()
  for (const f of requiredFields) {
    requiredByComp.set(f.competitionId, [...(requiredByComp.get(f.competitionId) ?? []), f.id])
  }
  // "Submitted" is a value in either column — same predicate as the register
  // endpoint and the Application Center.
  const answered = new Set(
    answers.filter((a) => a.textValue || a.fileUrl).map((a) => `${a.registrationId}:${a.fieldId}`),
  )

  const out = new Map<number, number>()
  for (const r of registrations) {
    const required = requiredByComp.get(r.competitionId) ?? []
    out.set(r.id, required.filter((fid) => !answered.has(`${r.id}:${fid}`)).length)
  }
  return out
}

/**
 * Free-text money. `prizes.amount` holds things like "$1,000" and "50000 BDT",
 * so a sum is only meaningful if every entry shares a currency — otherwise it
 * is 51000 of nothing. Return the ambiguity instead of hiding it.
 */
export function parsePrizeAmounts(amounts: string[]): {
  value: number
  entries: number
  unparsed: number
  currencyMixed: boolean
} {
  let value = 0
  let unparsed = 0
  const tokens = new Set<string>()

  for (const raw of amounts) {
    const s = String(raw ?? '')
    const n = Number.parseInt(s.replace(/[^\d]/g, ''), 10)
    if (Number.isFinite(n) && n > 0) value += n
    else unparsed++

    const token = s.replace(/[\d\s.,]/g, '').toUpperCase()
    if (token) tokens.add(token)
  }

  return { value, entries: amounts.length, unparsed, currencyMixed: tokens.size > 1 }
}

/**
 * A judge has finished a team when they have scored every criterion that
 * applies to it. Exported so getLeaderboard can call the same function and the
 * dashboard's "judges completed" can never disagree with the leaderboard's.
 */
export function judgeIsComplete(scoredCount: number, criteriaCount: number): boolean {
  return criteriaCount > 0 && scoredCount === criteriaCount
}
