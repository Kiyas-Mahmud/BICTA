import type { Ref } from 'vue'
import newsData from '~~/test-db/news-test-db.json'

export interface NewsItem {
  id: string
  title: string
  category: string
  date: string
  excerpt: string
  imageUrl: string
  url: string
}

/**
 * Composable to access news items from the test JSON data.
 * Swap-ready: to switch to a real API, replace the data source below
 * and the rest of the app requires zero changes.
 */
export function useNews(): { news: Ref<NewsItem[]>; loading: Ref<boolean> } {
  const news = ref<NewsItem[]>(newsData as NewsItem[])
  const loading = ref(false)
  return { news, loading }
}
