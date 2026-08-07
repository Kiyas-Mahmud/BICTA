// Shared handle on the global sidebar badge counts.
//
// One key, so invalidating it once after a write updates every consumer
// without a page reload. Every refreshAdminStats() call site resolves through
// this constant, which is why repointing the badge endpoint is a one-line
// change here rather than an edit to a dozen pages.
//
// Deliberately NOT the dashboard's key: the dashboard is scoped to one event,
// and sharing a key would have made picking a different event silently change
// the nav badge too.
export const ADMIN_STATS_KEY = 'admin-badges'

/** Call after any admin create/update/delete so the counts stay truthful. */
export function refreshAdminStats() {
  return refreshNuxtData(ADMIN_STATS_KEY)
}
