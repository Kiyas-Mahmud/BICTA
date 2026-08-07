// One definition of "is the application form open right now", shared by the
// public registration endpoint, the participant edit endpoint and the payloads
// that drive the dashboard — so the button a participant sees and the rule the
// server enforces can never disagree.

interface WindowSource {
  applicationOpensAt?: string | null
  applicationClosesAt?: string | null
  registrationDeadline?: string | null
}

export type ApplicationState = 'open' | 'upcoming' | 'closed'

export interface ApplicationWindow {
  state: ApplicationState
  opensAt: string | null
  /** Effective close date: the explicit one, else the registration deadline. */
  closesAt: string | null
}

// Dates are stored as plain YYYY-MM-DD. Opening counts from the start of the
// day, closing from the end of it, so a window of 1st–3rd includes all of the
// 3rd rather than expiring at midnight as it begins.
export function applicationWindow(comp: WindowSource, now = new Date()): ApplicationWindow {
  const opensAt = comp.applicationOpensAt ?? null
  const closesAt = comp.applicationClosesAt ?? comp.registrationDeadline ?? null

  if (opensAt && new Date(`${opensAt}T00:00:00Z`) > now) {
    return { state: 'upcoming', opensAt, closesAt }
  }
  if (closesAt && new Date(`${closesAt}T23:59:59Z`) < now) {
    return { state: 'closed', opensAt, closesAt }
  }
  return { state: 'open', opensAt, closesAt }
}
