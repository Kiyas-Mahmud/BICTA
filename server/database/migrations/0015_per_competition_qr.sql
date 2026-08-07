-- Move QR identity and collection records from the person to the person's
-- participation in a single competition.
--
-- Before: participant_accounts.checkin_token was one global QR, and checkins
-- were unique per (account, checkpoint) — so collecting a kit for one
-- competition marked it collected for every competition that person had
-- entered. team_members is the participation record, so both belong there.

-- 1. A QR per membership. Backfilled with random tokens; the column stays
--    nullable so the backfill and the app's own inserts can coexist, and the
--    unique index still forbids collisions.
ALTER TABLE team_members ADD COLUMN checkin_token TEXT;
--> statement-breakpoint
UPDATE team_members SET checkin_token = lower(hex(randomblob(24))) WHERE checkin_token IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS team_members_checkin_token_unique ON team_members (checkin_token);
--> statement-breakpoint

-- 2. Check-ins hang off the membership.
ALTER TABLE checkins ADD COLUMN team_member_id INTEGER REFERENCES team_members(id) ON DELETE CASCADE;
--> statement-breakpoint

-- Backfill in two passes rather than one ranked subquery: SQLite will not take
-- a correlated reference to the target table inside a subquery's ORDER BY.
-- First the rows that recorded which competition they belonged to.
UPDATE checkins
SET team_member_id = (
  SELECT tm.id FROM team_members tm
  WHERE tm.account_id = checkins.account_id
    AND tm.competition_id = checkins.competition_id
  LIMIT 1
)
WHERE team_member_id IS NULL AND competition_id IS NOT NULL;
--> statement-breakpoint

-- Then anything left from an event-wide desk, which can only be attributed to
-- the person's earliest membership.
UPDATE checkins
SET team_member_id = (
  SELECT tm.id FROM team_members tm
  WHERE tm.account_id = checkins.account_id
  ORDER BY tm.id
  LIMIT 1
)
WHERE team_member_id IS NULL;
--> statement-breakpoint

-- 3. Swap the double-collection guard over to the membership. This is the
--    change that actually separates the competitions: the same person may now
--    collect the same checkpoint once per competition they entered.
DROP INDEX IF EXISTS checkins_account_checkpoint_unique;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS checkins_member_checkpoint_unique ON checkins (team_member_id, checkpoint_id);
--> statement-breakpoint

-- 4. Per-competition schedule, used to reject a scan outside its window.
--    Full ISO timestamps (UTC), unlike the event's plain YYYY-MM-DD dates.
ALTER TABLE competitions ADD COLUMN starts_at TEXT;
--> statement-breakpoint
ALTER TABLE competitions ADD COLUMN ends_at TEXT;
