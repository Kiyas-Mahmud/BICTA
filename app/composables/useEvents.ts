import type { Ref } from 'vue'

// Real events (yearly editions) — the `events` table, each with its own
// competitions nested. Fed by /api/public/events, prefetched into useState by
// app/plugins/content.ts.
export interface EventListing {
  id: string
  title: string
  slug: string
  year: number
  status: 'ongoing' | 'upcoming' | 'past'
  startDate: string
  endDate: string
  venue: string
  imageUrl: string
  description: string
  competitions: Array<{
    id: string
    slug: string
    name: string
    type: string
    imageUrl: string
    registrationOpen: boolean
    prize: string
  }>
}

function eventsState() {
  return useState<EventListing[]>('public-events', () => [])
}

export function useEvents(): { events: Ref<EventListing[]>; loading: Ref<boolean> } {
  return { events: eventsState(), loading: ref(false) }
}

/** Resolve by slug (canonical) or legacy numeric id. */
export function useEventById(slugOrId: string): { event: Ref<EventListing | undefined>; loading: Ref<boolean> } {
  const events = eventsState()
  const event = computed(() => events.value.find((e) => e.slug === slugOrId || e.id === slugOrId))
  return { event, loading: ref(false) }
}
