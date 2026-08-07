-- Moderators: a second console role that does content work but never touches
-- site settings, moderator management or the audit log. SQLite cannot alter a
-- CHECK constraint in place, and the role column has none (Drizzle enforces
-- the enum in TypeScript), so widening it needs no DDL.
-- No DEFAULT: SQLite rejects a non-constant default on ADD COLUMN, and
-- backfilling one constant timestamp onto pre-existing rows would be a lie.
-- New rows set it explicitly at insert time instead.
ALTER TABLE admins ADD COLUMN created_at TEXT;
--> statement-breakpoint

-- Who did what in the console. Actor name/email are denormalised so history
-- stays readable after a moderator is deleted.
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  actor_name TEXT NOT NULL DEFAULT '',
  actor_email TEXT NOT NULL DEFAULT '',
  actor_role TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id INTEGER,
  summary TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON audit_logs (created_at);
--> statement-breakpoint

-- Preliminary selection: hold decision emails until the announcement date so
-- every team hears at the same moment. Null keeps the old send-immediately.
ALTER TABLE competitions ADD COLUMN results_announce_at TEXT;
--> statement-breakpoint
ALTER TABLE registrations ADD COLUMN decision_notified_at TEXT;
