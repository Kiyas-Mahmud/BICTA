import bcrypt from 'bcryptjs'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import * as schema from '../server/database/schema'

// Creates the first administrator, and nothing else.
//
// This deliberately seeds NO sample content. Everything the site shows —
// events, competitions, judges, sponsors, news, gallery, FAQs, venue, section
// headings — is created by the operator through the admin console, so a fresh
// install starts empty rather than shipping someone else's placeholder data
// that has to be hunted down and deleted before launch.
//
// It also no longer creates demo volunteer/participant logins. Those had
// hardcoded passwords and were created even in production, which is an open
// door on a live deployment. Staff are invited by email from the console, and
// participants register themselves.
//
// scripts/seed-d1.ts runs this against a throwaway local SQLite file, dumps
// the resulting rows as SQL, and pushes that to D1 (which is only reachable
// through a Worker binding, never from a plain node script).

const WEAK_PASSWORDS = new Set(['admin', 'password', 'change-me-min-12-chars', 'changeme'])

export async function seed(db: BetterSQLite3Database<typeof schema>) {
  const name = process.env.ADMIN_NAME ?? 'Admin'
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.ADMIN_PASSWORD

  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env')
  }
  if (password.length < 12 || WEAK_PASSWORDS.has(password)) {
    throw new Error('ADMIN_PASSWORD must be at least 12 characters and not a default value')
  }
  if (process.env.NODE_ENV === 'production' && email.endsWith('@example.com')) {
    throw new Error('Refusing to seed example.com admin email in production')
  }

  // Upsert by email, so re-running is safe and doubles as a password reset.
  const passwordHash = await bcrypt.hash(password, 12)
  await db
    .insert(schema.admins)
    .values({ name, email, passwordHash, role: 'admin', status: 'active', createdAt: new Date().toISOString() })
    .onConflictDoUpdate({
      target: schema.admins.email,
      set: { name, passwordHash, role: 'admin', status: 'active' },
    })

  console.log(`Admin ready: ${email}`)
  console.log('No sample content seeded — build the site from the admin console.')
}
