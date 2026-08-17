import { getAdvisors, getSettings } from '../../utils/queries'

// Everything /about renders in one request: the advisory panel plus the
// settings that carry the page's headings and intro prose.
export default defineEventHandler(async () => {
  const [advisors, settings] = await Promise.all([getAdvisors(), getSettings()])
  return { advisors, settings }
})
