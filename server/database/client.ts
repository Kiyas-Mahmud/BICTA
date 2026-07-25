import { drizzle } from 'drizzle-orm/d1'
import { useEvent } from 'nitropack/runtime'
import type { H3Event } from 'h3'
import * as schema from './schema'

// Single switch point for the database driver: Cloudflare D1 through the `DB`
// binding declared in wrangler.jsonc. `nitro-cloudflare-dev` exposes the same
// binding locally during `nuxt dev` (miniflare, state under .wrangler/), so dev
// and production run identical code paths.
//
// D1 is async-only — every query must be awaited, and db.batch() replaces
// interactive transactions (D1 has none).

type Db = ReturnType<typeof drizzle<typeof schema>>

function bindingOf(event?: H3Event) {
  const ctx = (event ?? useEvent())?.context as { cloudflare?: { env?: Record<string, any> } } | undefined
  return ctx?.cloudflare?.env?.DB
}

/**
 * Drizzle instance bound to this request's D1 database.
 *
 * `event` is optional: with nitro's asyncContext enabled the current request is
 * resolved automatically, which keeps existing call sites unchanged. Pass it
 * explicitly from anywhere running outside a request (plugins, tasks).
 */
export function useDb(event?: H3Event): Db {
  const d1 = bindingOf(event)
  if (!d1) {
    throw createError({
      statusCode: 500,
      statusMessage: 'D1 binding "DB" unavailable. Run through nuxt dev / wrangler and check wrangler.jsonc.',
    })
  }
  return drizzle(d1, { schema })
}

export { schema }
