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

// Prize amounts are free text ("100000 BDT"). Total only the parseable ones;
// suffix comes from whatever follows the digits in the first amount.
export function prizePoolTotal(amounts: string[]): string | null {
  let total = 0
  let suffix = ''
  let parsed = 0
  for (const a of amounts) {
    const m = a.replace(/[,\s]/g, '').match(/^(\d+)(.*)$/)
    if (!m) continue
    total += Number(m[1])
    if (!suffix && m[2]) suffix = m[2]
    parsed++
  }
  if (parsed === 0) return null
  return `${total.toLocaleString()}${suffix ? ' ' + suffix : ''}`
}
