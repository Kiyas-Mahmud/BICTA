import type { EventPhase } from '../eventPhase'
import type { ApplicationState } from '../application'
import type { WindowState } from '../competitionWindow'

export interface DashboardEventRef {
  id: number
  title: string
  year: number
  status: string
  isCurrent: boolean
  published: boolean
}

export interface TeamSplit {
  total: number
  confirmed: number
  pending: number
  rejected: number
  /** total - rejected. The number that belongs in a headline. */
  active: number
}

export interface DashboardPayload {
  /** Everything the switcher needs; always populated, even with no event selected. */
  events: DashboardEventRef[]
  event: (DashboardEventRef & {
    slug: string
    startDate: string | null
    endDate: string | null
    venue: string | null
  }) | null

  phase: EventPhase | null

  headline: {
    /** Distinct humans. */
    people: number
    /** Roster seats — the denominator for collection maths. */
    participations: number
    teams: TeamSplit
    institutions: number
    checkins: number
    checkpoints: number
    competitions: number
    prizePool: { value: number; entries: number; unparsed: number; currencyMixed: boolean }
    /** null for finished events — a "-100%" badge on a past event is noise. */
    delta: { registrations: { current: number; previous: number; days: number } } | null
  }

  funnel: {
    unit: 'participations'
    stages: Array<{
      key: 'registered' | 'submitted' | 'confirmed' | 'activated' | 'checked-in'
      label: string
      value: number
      /** anyStatus: checked in regardless of decision — see the funnel notes. */
      meta?: { anyStatus?: number }
    }>
  }

  trend: {
    from: string
    to: string
    /** True when the window was re-anchored to where the data actually is. */
    windowShifted: boolean
    series: Array<{ day: string; label: string; value: number }>
  }

  competitions: Array<{
    id: number
    name: string
    teamBased: boolean
    maxTeamSize: number
    teams: TeamSplit
    participations: number
    /** Capacity is not derivable; this answers "are teams arriving full?" */
    rosterFullness: number | null
    registration: 'open' | 'closed' | 'deadline-passed'
    application: ApplicationState
    window: WindowState
    judgingOpen: boolean
  }>

  applications: {
    /** False when no competition in this event defines a form. */
    inScope: boolean
    totals: {
      expected: number
      submitted: number
      missingRequired: number
      pendingReview: number
      awaitingAnnouncement: { embargoed: number; overdue: number }
    }
  }

  collection: {
    checkpoints: Array<{ id: number; name: string; competitionId: number | null }>
    columns: Array<{ id: number | null; name: string; eligible: number }>
    cells: Array<{ checkpointId: number; competitionId: number | null; collected: number }>
    collected: number
    eligible: number
    /** Rows with a null teamMemberId escape the double-collection guard. */
    orphanedCheckins: number
  }

  judging: Array<{
    competitionId: number
    name: string
    teamsTotal: number
    teamsScored: number
    judgesTotal: number
    criteriaCount: number
    judgingOpen: boolean
  }>

  institutions: Array<{ name: string; teams: number; people: number }>
  teamSizes: Array<{ size: number; teams: number }>
  recentRegistrations: Array<{
    id: number
    fullName: string
    teamName: string | null
    status: string
    competitionName: string
    createdAt: string
  }>
}
