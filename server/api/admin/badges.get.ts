import { count, eq } from 'drizzle-orm'
import { useDb, schema } from '../../database/client'

// Global counters for the sidebar badge, on every admin page.
//
// Split out of the old stats.get.ts deliberately: the dashboard is now scoped
// to one event, and the layout shared its useFetch key. Left together, picking
// a different event in the dashboard would have silently changed the nav badge
// too. These two numbers are also the ones that genuinely have no event
// dimension — a contact-form message is not about an edition.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const db = useDb()

  const [pending, unread] = await db.batch([
    db
      .select({ n: count() })
      .from(schema.registrations)
      .where(eq(schema.registrations.status, 'pending')),
    db
      .select({ n: count() })
      .from(schema.contactMessages)
      .where(eq(schema.contactMessages.isRead, false)),
  ])

  return {
    pendingRegistrations: pending[0]?.n ?? 0,
    unreadMessages: unread[0]?.n ?? 0,
  }
})
