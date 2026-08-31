/**
 * Seeds Cloudflare D1.
 *
 * D1 is only reachable through a Worker binding, so a plain node script cannot
 * talk to it directly. Instead this:
 *   1. builds a throwaway local SQLite file,
 *   2. applies the same Drizzle migrations wrangler applies to D1,
 *   3. runs the shared seed() from scripts/seed.ts against it (bcrypt hashing
 *      happens here, in node),
 *   4. dumps every resulting row as INSERT statements,
 *   5. hands that file to `wrangler d1 execute`.
 *
 * Usage:
 *   npm run seed              # local (miniflare) D1 used by nuxt dev
 *   npm run seed:remote       # the real D1 database
 *   ... -- --force            # seed even when the target already has events
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from '../server/database/schema'
import { seed } from './seed'

const MIGRATIONS_DIR = 'server/database/migrations'
const WORK_DIR = '.data'
const TEMP_DB = join(WORK_DIR, 'seed-build.db')
const OUT_SQL = join(WORK_DIR, 'seed.sql')

const remote = process.argv.includes('--remote')
const force = process.argv.includes('--force')
const target = remote ? '--remote' : '--local'

function sqlLiteral(value: unknown): string {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'number') return String(value)
  if (typeof value === 'bigint') return value.toString()
  if (Buffer.isBuffer(value)) return `X'${value.toString('hex')}'`
  return `'${String(value).replace(/'/g, "''")}'`
}

function wrangler(args: string[]) {
  // shell: true is needed for npx on Windows, so anything with spaces (the SQL
  // probe) has to be quoted explicitly.
  const quoted = ['wrangler', ...args].map((a) => (/\s/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a))
  return execFileSync('npx', quoted, { encoding: 'utf8', shell: true })
}

async function main() {
  mkdirSync(WORK_DIR, { recursive: true })
  rmSync(TEMP_DB, { force: true })

  // 1 + 2: fresh SQLite with the migrated schema.
  const sqlite = new Database(TEMP_DB)
  sqlite.pragma('foreign_keys = ON')
  for (const file of readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort()) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8')
    for (const statement of sql.split('--> statement-breakpoint')) {
      const trimmed = statement.trim()
      if (trimmed) sqlite.exec(trimmed)
    }
  }

  // 3: the shared seed content.
  await seed(drizzle(sqlite, { schema }))

  // 4: dump every row, in dependency order (the table list follows the
  // migration order, so parents are inserted before children).
  const tables = sqlite
    .prepare(
      `select name from sqlite_master where type = 'table'
       and name not like 'sqlite_%' and name <> 'd1_migrations' order by rowid`,
    )
    .all() as { name: string }[]

  const lines: string[] = []
  let rowCount = 0
  for (const { name } of tables) {
    const rows = sqlite.prepare(`select * from "${name}"`).all() as Record<string, unknown>[]
    if (!rows.length) continue
    const columns = Object.keys(rows[0]!)
    for (const row of rows) {
      // INSERT OR REPLACE keeps a re-run from exploding on primary keys.
      lines.push(
        `INSERT OR REPLACE INTO "${name}" (${columns.map((c) => `"${c}"`).join(', ')}) VALUES (${columns
          .map((c) => sqlLiteral(row[c]))
          .join(', ')});`,
      )
      rowCount++
    }
  }
  sqlite.close()
  rmSync(TEMP_DB, { force: true })

  if (!lines.length) throw new Error('Seed produced no rows')
  // sqlite_master order is creation order, not dependency order (children can
  // precede parents across migrations). Deferring FK checks to the end of the
  // import transaction is the documented D1 approach.
  writeFileSync(OUT_SQL, `PRAGMA defer_foreign_keys = on;\n${lines.join('\n')}\n`)
  console.log(`Built ${OUT_SQL}: ${rowCount} rows across ${tables.length} tables.`)

  // 5: guard against silently doubling data, then push.
  if (!force) {
    const probe = wrangler(['d1', 'execute', 'bicta-net', target, '--json', '--command', 'select count(*) as n from events'])
    const existing = Number(JSON.parse(probe.slice(probe.indexOf('[')))?.[0]?.results?.[0]?.n ?? 0)
    if (existing > 0) {
      console.log(`Target ${remote ? 'remote' : 'local'} D1 already has ${existing} events — skipping. Pass --force to seed anyway.`)
      return
    }
  }

  console.log(wrangler(['d1', 'execute', 'bicta-net', target, '--file', OUT_SQL, '--yes']))
  console.log(`Seeded ${remote ? 'remote' : 'local'} D1.`)
}

main().catch((err) => {
  console.error(err.message ?? err)
  process.exit(1)
})
