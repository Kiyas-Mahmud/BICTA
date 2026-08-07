// When is a competition "live" for the purposes of scanning?
//
// One definition, used by both the scan lookup (to warn) and the check-in
// write (to refuse). Keeping them on the same function is what stops the
// scanner promising something the write then rejects.
//
// All comparisons are UTC. Competition startsAt/endsAt are full ISO
// timestamps; the parent event only has plain YYYY-MM-DD dates, so when a
// competition has no window of its own the event's range is widened to cover
// whole days (00:00:00 through 23:59:59) rather than snapping to midnight.

export type WindowState = 'live' | 'upcoming' | 'ended' | 'unscheduled'

interface CompetitionLike {
  name?: string
  startsAt?: string | null
  endsAt?: string | null
}
interface EventLike {
  startDate?: string | null
  endDate?: string | null
}

export interface CompetitionWindow {
  state: WindowState
  startsAt: string | null
  endsAt: string | null
  /** True only when a check-in may be written right now. */
  open: boolean
  /** Ready-to-show explanation when it is not open. */
  reason: string | null
}

function startBoundary(comp: CompetitionLike, ev?: EventLike | null): string | null {
  if (comp.startsAt) return comp.startsAt
  return ev?.startDate ? `${ev.startDate}T00:00:00.000Z` : null
}
function endBoundary(comp: CompetitionLike, ev?: EventLike | null): string | null {
  if (comp.endsAt) return comp.endsAt
  return ev?.endDate ? `${ev.endDate}T23:59:59.999Z` : null
}

function human(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  })
}

export function competitionWindow(
  comp: CompetitionLike,
  ev?: EventLike | null,
  now: Date = new Date(),
): CompetitionWindow {
  const startsAt = startBoundary(comp, ev)
  const endsAt = endBoundary(comp, ev)
  const label = comp.name ?? 'This competition'

  // Nothing scheduled anywhere: allow the scan rather than block an event that
  // simply has not filled in its dates. Refusing here would break check-in for
  // every competition that never set one.
  if (!startsAt && !endsAt) {
    return { state: 'unscheduled', startsAt, endsAt, open: true, reason: null }
  }

  if (startsAt && now < new Date(startsAt)) {
    return {
      state: 'upcoming',
      startsAt,
      endsAt,
      open: false,
      reason: `${label} has not started yet. Scheduled for ${human(startsAt)}.`,
    }
  }

  if (endsAt && now > new Date(endsAt)) {
    return {
      state: 'ended',
      startsAt,
      endsAt,
      open: false,
      reason: `${label} has already ended.`,
    }
  }

  return { state: 'live', startsAt, endsAt, open: true, reason: null }
}
