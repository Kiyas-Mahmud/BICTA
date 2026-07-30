/**
 * Shared "which event am I looking at?" control for the admin screens whose
 * content is event-scoped (timeline, sponsors, judges, winners).
 *
 * Events come back newest-first, and the current edition is pulled to the very
 * front, so the list an admin needs day to day is the one they land on. The
 * choice is kept in the URL, so a refresh or a shared link stays put.
 */
export function useEventFilter(options: { allowAll?: boolean } = {}) {
  const route = useRoute()
  const { data: tree } = useFetch('/api/admin/event-tree', { key: 'admin-event-tree' })

  const events = computed(() => {
    const rows = [...(tree.value ?? [])] as any[]
    // Newest edition first, with the current one promoted above it.
    rows.sort((a, b) => Number(b.isCurrent) - Number(a.isCurrent) || b.year - a.year || b.id - a.id)
    return rows
  })

  const eventOptions = computed(() => [
    ...(options.allowAll ? [{ value: '', label: 'All events' }] : []),
    ...events.value.map((e) => ({
      value: e.id,
      label: `${e.title}${e.isCurrent ? ' · current' : ''}`,
    })),
  ])

  // Default to the first option: the current edition, else the newest.
  const fallback = computed(() => (options.allowAll ? '' : (events.value[0]?.id ?? '')))

  const eventId = computed<number | ''>({
    get() {
      const q = route.query.event
      if (q === undefined || q === '') return options.allowAll && q === '' ? '' : fallback.value
      const n = Number(q)
      return Number.isFinite(n) && n > 0 ? n : fallback.value
    },
    set(v) {
      navigateTo({ query: { ...route.query, event: v === '' ? undefined : String(v) } }, { replace: true })
    },
  })

  /** Pass straight to AdminCollection's `query` prop. */
  const query = computed(() => (eventId.value === '' ? {} : { eventId: eventId.value }))

  const activeEvent = computed(() => events.value.find((e) => e.id === eventId.value))

  return { events, eventOptions, eventId, query, activeEvent }
}
