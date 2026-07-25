import type { EventListing } from '~/composables/useEvents'
import type { Competition } from '~/composables/useCompetitions'
import type { NewsItem } from '~/composables/useNews'

// Prefetch the DB-backed content once (server render), hydrate to client via
// useState. Pages read this state synchronously via useEvents/useCompetitions/
// useNews, so no page needs its own network round-trip.
//
// Uses useRequestFetch() rather than the global $fetch: on the Cloudflare
// Workers runtime a relative-URL $fetch called outside a page/component
// context (like here, in a plugin) has no request to resolve against and
// silently fails — useRequestFetch() carries that context through, and
// serves the same internal-fetch role in Node too.
export default defineNuxtPlugin(async () => {
  const events = useState<EventListing[]>('public-events', () => [])
  const competitions = useState<Competition[]>('public-competitions', () => [])
  const news = useState<NewsItem[]>('site-news', () => [])

  const requestFetch = import.meta.server ? useRequestFetch() : $fetch

  const jobs: Promise<void>[] = []
  if (!events.value.length) {
    jobs.push(requestFetch<EventListing[]>('/api/public/events').then((d) => { events.value = d }).catch(() => {}))
  }
  if (!competitions.value.length) {
    jobs.push(requestFetch<Competition[]>('/api/public/competitions').then((d) => { competitions.value = d }).catch(() => {}))
  }
  if (!news.value.length) {
    jobs.push(requestFetch<NewsItem[]>('/api/public/site-news').then((d) => { news.value = d }).catch(() => {}))
  }
  await Promise.all(jobs)
})
