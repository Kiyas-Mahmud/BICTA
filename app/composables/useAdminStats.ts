// Shared handle on the dashboard statistics payload.
//
// Everything that reads counts (the dashboard, the sidebar badges) uses the
// same 'admin-stats' key, so invalidating it once after a write updates every
// consumer without a page reload.
export const ADMIN_STATS_KEY = 'admin-stats'

/** Call after any admin create/update/delete so the counts stay truthful. */
export function refreshAdminStats() {
  return refreshNuxtData(ADMIN_STATS_KEY)
}
