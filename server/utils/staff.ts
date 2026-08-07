// Shared rules for console/staff accounts (volunteers and moderators).

export const STAFF_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

/**
 * May this account sign in right now?
 *
 * An invited account has no password yet (password_hash is ''), and a banned
 * one is kept for the record but refused. Both the login route and the
 * per-request guard use this, so a ban takes effect on the next request rather
 * than whenever the session happens to expire.
 */
export function staffCanSignIn(row: { status?: string | null; passwordHash?: string | null } | undefined | null): boolean {
  if (!row) return false
  const status = row.status ?? 'active'
  return status === 'active' && Boolean(row.passwordHash)
}

/** Message shown when an account exists but is not usable. */
export function staffBlockedReason(status: string | null | undefined): string {
  if (status === 'invited') return 'Your account is not active yet. Use the link in your invitation email to set a password.'
  if (status === 'banned') return 'This account has been suspended. Contact an administrator.'
  return 'This account cannot sign in.'
}
