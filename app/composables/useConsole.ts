// Small formatting/display helpers shared by the admin console and the
// volunteer scanner. Presentation only — no data access, no business rules.

/** "Kiyas Mahmud" -> "KM"; falls back to the first two email chunks. */
export function initialsOf(name?: string | null) {
  const n = (name || '?').trim()
  return (
    n
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || '?'
  )
}

/** SQLite timestamps are stored UTC without a zone marker — append Z. */
export function parseUtc(iso: string) {
  return new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`)
}

export function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - parseUtc(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`
  return parseUtc(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/**
 * Short console date. Named `formatDay` so it does not collide with the public
 * site's long-form `formatDate` in `useFormat.ts`.
 */
export function formatDay(iso?: string | null, opts?: Intl.DateTimeFormatOptions) {
  if (!iso) return '—'
  return parseUtc(iso).toLocaleDateString(undefined, opts ?? { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatTime(iso: string | number) {
  const d = typeof iso === 'number' ? new Date(iso) : parseUtc(iso)
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export type StatusTone = 'neutral' | 'brand' | 'ok' | 'warn' | 'bad'

/** Maps the domain status strings used across the console to a pill tone. */
const STATUS_TONES: Record<string, StatusTone> = {
  confirmed: 'ok',
  published: 'ok',
  ongoing: 'ok',
  open: 'ok',
  active: 'ok',
  collected: 'ok',
  pending: 'warn',
  invited: 'warn',
  upcoming: 'brand',
  current: 'brand',
  new: 'brand',
  rejected: 'bad',
  draft: 'neutral',
  past: 'neutral',
  closed: 'neutral',
  read: 'neutral',
}

export function statusTone(status?: string | null): StatusTone {
  return STATUS_TONES[(status ?? '').toLowerCase()] ?? 'neutral'
}
