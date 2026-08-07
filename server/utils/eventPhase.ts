import { applicationWindow, type ApplicationState } from './application'
import { competitionWindow, type WindowState } from './competitionWindow'

// Where an event is in its lifecycle, so the dashboard can lead with what
// matters now instead of showing an empty check-in heatmap two months out.
//
// Pure and `now`-injectable: no DB access, so it is testable directly and can
// be re-derived on the client if ever needed.

export type Phase =
  | 'draft'
  | 'pre-registration'
  | 'registration-open'
  | 'review'
  | 'event-live'
  | 'judging'
  | 'complete'

export interface PhaseFlags {
  registrationOpen: boolean
  applicationsOpen: boolean
  anyCompetitionLive: boolean
  judgingOpen: boolean
  decisionsPending: boolean
  announcementsPending: boolean
}

export interface CompetitionPhase {
  id: number
  name: string
  registration: 'open' | 'closed' | 'deadline-passed'
  application: ApplicationState
  window: WindowState
  judgingOpen: boolean
}

export interface EventPhase {
  phase: Phase
  flags: PhaseFlags
  competitions: CompetitionPhase[]
}

interface EventLike {
  status?: string | null
  published?: boolean | null
  startDate?: string | null
  endDate?: string | null
}

interface CompetitionLike {
  id: number
  name: string
  registrationOpen: boolean
  registrationDeadline: string | null
  judgingOpen: boolean
  applicationOpensAt: string | null
  applicationClosesAt: string | null
  startsAt: string | null
  endsAt: string | null
}

interface Signals {
  /** Applications submitted and still awaiting a decision. */
  pendingReview: number
  /** Decided but not yet emailed. */
  awaitingAnnouncement: number
  /** Any score rows at all — distinguishes "judging open" from "judging underway". */
  anyScores: boolean
}

function registrationState(comp: CompetitionLike, now: Date): CompetitionPhase['registration'] {
  if (comp.registrationDeadline && new Date(`${comp.registrationDeadline}T23:59:59Z`) < now) {
    return 'deadline-passed'
  }
  return comp.registrationOpen ? 'open' : 'closed'
}

/**
 * An event holds N competitions that are routinely in N different states — one
 * closed and being judged while another is still taking sign-ups. A single
 * enum forces one lie, so the enum drives only the header chip and the hero
 * figure; the UI gates individual widgets on `flags`.
 */
export function eventPhase(
  event: EventLike,
  competitions: CompetitionLike[],
  signals: Signals,
  now: Date = new Date(),
): EventPhase {
  const perCompetition: CompetitionPhase[] = competitions.map((c) => ({
    id: c.id,
    name: c.name,
    registration: registrationState(c, now),
    application: applicationWindow(c, now).state,
    window: competitionWindow(c, event, now).state,
    judgingOpen: c.judgingOpen,
  }))

  const flags: PhaseFlags = {
    registrationOpen: perCompetition.some((c) => c.registration === 'open'),
    applicationsOpen: perCompetition.some((c) => c.application === 'open'),
    anyCompetitionLive: perCompetition.some((c) => c.window === 'live'),
    judgingOpen: perCompetition.some((c) => c.judgingOpen),
    decisionsPending: signals.pendingReview > 0,
    announcementsPending: signals.awaitingAnnouncement > 0,
  }

  // First match wins. Ordered by "what does the organiser need to look at
  // right now" — live outranks registration because late sign-ups during a
  // running event are normal, and the live view is the urgent one.
  const phase: Phase = event.published === false
    ? 'draft'
    : event.status === 'past'
      ? 'complete'
      : flags.anyCompetitionLive
        ? 'event-live'
        : flags.registrationOpen
          ? 'registration-open'
          : flags.judgingOpen && signals.anyScores
            ? 'judging'
            : flags.decisionsPending || flags.announcementsPending
              ? 'review'
              : event.status === 'upcoming'
                ? 'pre-registration'
                : 'complete'

  return { phase, flags, competitions: perCompetition }
}
