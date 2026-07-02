import type { Ref } from 'vue'

export interface HackathonEvent {
  id: string
  title: string
  status: 'ongoing' | 'upcoming' | 'past'
  startDate: string
  endDate: string
  location: string
  prize: string
  tags: string[]
  organizer: string
  teamSizeMin: number
  teamSizeMax: number
  description: string
  imageUrl: string
  registrationDeadline: string
  website: string
  eligibility?: string
  registrationOpen?: boolean
  judges: Array<{ name: string; role: string; avatar: string }>
  sponsors: Array<{ name: string; logo: string }>
  rules: string[]
  faqs: Array<{ id: number; question: string; answer: string }>
}

// Data now comes from the admin database via /api/public/hackathon-events,
// prefetched into useState by app/plugins/content.ts. Same synchronous API the
// pages already use, so swapping the source required no page changes.
function eventsState() {
  return useState<HackathonEvent[]>('hackathon-events', () => [])
}

export function useEvents(): { events: Ref<HackathonEvent[]>; loading: Ref<boolean> } {
  return { events: eventsState(), loading: ref(false) }
}

export function useEventById(id: string): { event: Ref<HackathonEvent | undefined>; loading: Ref<boolean> } {
  const events = eventsState()
  const event = computed(() => events.value.find((e) => e.id === id))
  return { event, loading: ref(false) }
}

export function useEventsByStatus(status: HackathonEvent['status']): Ref<HackathonEvent[]> {
  const events = eventsState()
  return computed(() => events.value.filter((e) => e.status === status))
}

export function useFeaturedEvents(): Ref<HackathonEvent[]> {
  const events = eventsState()
  return computed(() => events.value.filter((e) => e.status === 'ongoing' || e.status === 'upcoming'))
}
