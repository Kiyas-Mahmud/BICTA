import type { Ref } from 'vue'
import eventsData from '~~/test-db/dummy-event-data.json'

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
  judges: Array<{ name: string; role: string; avatar: string }>
  sponsors: Array<{ name: string; logo: string }>
  rules: string[]
  faqs: Array<{ id: number; question: string; answer: string }>
}

/**
 * Composable to access hackathon events from the test JSON data.
 * Swap-ready: to switch to a real API, replace the data source below
 * and the rest of the app requires zero changes.
 */
export function useEvents(): { events: Ref<HackathonEvent[]>; loading: Ref<boolean> } {
  const events = ref<HackathonEvent[]>(eventsData as HackathonEvent[])
  const loading = ref(false)
  return { events, loading }
}

export function useEventById(id: string): { event: Ref<HackathonEvent | undefined>; loading: Ref<boolean> } {
  const event = ref<HackathonEvent | undefined>(
    (eventsData as HackathonEvent[]).find((e) => e.id === id),
  )
  const loading = ref(false)
  return { event, loading }
}

export function useEventsByStatus(status: HackathonEvent['status']): Ref<HackathonEvent[]> {
  return ref((eventsData as HackathonEvent[]).filter((e) => e.status === status))
}

export function useFeaturedEvents(): Ref<HackathonEvent[]> {
  return ref(
    (eventsData as HackathonEvent[]).filter((e) => e.status === 'ongoing' || e.status === 'upcoming'),
  )
}
