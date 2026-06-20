import { mkdirSync } from 'node:fs'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

// Single switch point for the database driver. SQLite (file in .data/) is the
// default; production Postgres support lands here later via DATABASE_URL.
const DB_DIR = '.data'
const DB_PATH = `${DB_DIR}/bicta.db`

let _db: ReturnType<typeof createDb> | null = null

function createDb() {
  mkdirSync(DB_DIR, { recursive: true })
  const sqlite = new Database(DB_PATH)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')
  return drizzle(sqlite, { schema })
}

export function useDb() {
  if (!_db) _db = createDb()
  return _db
}

export { schema }
