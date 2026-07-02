import type { HackathonEvent } from '~/composables/useEvents'
import type { NewsItem } from '~/composables/useNews'

// Prefetch the DB-backed content once (server render), hydrate to client via
// useState. Zubayer's composables read this state synchronously, so his pages
// need no changes while the data now comes from the admin database.
export default defineNuxtPlugin(async () => {
  const events = useState<HackathonEvent[]>('hackathon-events', () => [])
  const news = useState<NewsItem[]>('site-news', () => [])

  const jobs: Promise<void>[] = []
  if (!events.value.length) {
    jobs.push($fetch<HackathonEvent[]>('/api/public/hackathon-events').then((d) => { events.value = d }).catch(() => {}))
  }
  if (!news.value.length) {
    jobs.push($fetch<NewsItem[]>('/api/public/site-news').then((d) => { news.value = d }).catch(() => {}))
  }
  await Promise.all(jobs)
})
