export function formatDate(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export function formatDateRange(start?: string | null, end?: string | null): string {
  if (!start && !end) return ''
  if (start && end && start !== end) return `${formatDate(start)} – ${formatDate(end)}`
  return formatDate(start ?? end)
}
