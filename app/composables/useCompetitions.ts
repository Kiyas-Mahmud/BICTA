import type { Ref } from 'vue'

// Competitions (the contests inside an event), each carrying its parent
// eventId so pages can build /events/[eventId]/[competitionId] links. Fed by
// /api/public/competitions, prefetched into useState by app/plugins/content.ts.
export interface Competition {
  id: string
  slug: string
  eventId: string
  eventSlug: string
  eventTitle: string
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
  registrationOpen: boolean
  registeredCount: number
  prizes: Array<{ position: string; amount: string; note: string | null }>
  judges: Array<{ name: string; role: string; avatar: string }>
  sponsors: Array<{ name: string; logo: string }>
  rules: string[]
  faqs: Array<{ id: number; question: string; answer: string }>
}

function competitionsState() {
  return useState<Competition[]>('public-competitions', () => [])
}

export function useCompetitions(): { competitions: Ref<Competition[]>; loading: Ref<boolean> } {
  return { competitions: competitionsState(), loading: ref(false) }
}

/** Resolve by slug (canonical) or legacy numeric id. */
export function useCompetitionById(slugOrId: string): { competition: Ref<Competition | undefined>; loading: Ref<boolean> } {
  const competitions = competitionsState()
  const competition = computed(() => competitions.value.find((c) => c.slug === slugOrId || c.id === slugOrId))
  return { competition, loading: ref(false) }
}

export function useFeaturedCompetitions(): Ref<Competition[]> {
  const competitions = competitionsState()
  return computed(() => competitions.value.filter((c) => c.status === 'ongoing' || c.status === 'upcoming'))
}
