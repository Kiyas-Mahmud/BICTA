import type { Ref } from 'vue'

export interface NewsItem {
  id: string
  title: string
  category: string
  date: string
  excerpt: string
  imageUrl: string
  url: string
}

// Backed by the admin database via /api/public/site-news, prefetched into
// useState by app/plugins/content.ts.
export function useNews(): { news: Ref<NewsItem[]>; loading: Ref<boolean> } {
  const news = useState<NewsItem[]>('site-news', () => [])
  return { news, loading: ref(false) }
}
