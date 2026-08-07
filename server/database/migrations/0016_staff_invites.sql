-- Staff accounts are invited rather than issued a password by an admin, and
-- can be banned without losing their history.
--
-- password_hash stays NOT NULL: rebuilding the admins table would mean
-- dropping and recreating it while audit_logs.actor_id and checkins.scanned_by
-- point at it. An invited account stores '' instead, which is not a valid
-- bcrypt hash and is never passed to compare() — status is the real gate.
ALTER TABLE admins ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
--> statement-breakpoint
ALTER TABLE admins ADD COLUMN invite_token TEXT;
--> statement-breakpoint
ALTER TABLE admins ADD COLUMN invite_expires TEXT;
--> statement-breakpoint

-- Existing rows all have real passwords, so 'active' (the column default) is
-- already correct for them and needs no backfill.
CREATE UNIQUE INDEX IF NOT EXISTS admins_invite_token_unique ON admins (invite_token);
