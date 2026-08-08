-- Repair schema drift: objects that exist in schema.ts (and in the original
-- `bicta` database) but that no migration ever created.
--
-- These were applied to the old database out-of-band -- almost certainly by an
-- early `drizzle-kit push` -- so the running site kept working while the
-- migration history quietly fell behind. It only surfaced when `bicta-net` was
-- built from migrations alone: `getCurrentEventFull()` does a `select()` over
-- every column schema.ts declares, so SQLite raised "no such column:
-- events.featured" and /api/public/home returned 500 on an empty database.
--
-- Column lists here were taken from the old database's DDL, so a database
-- migrated from zero now matches one that grew organically.
--
-- Every ADD COLUMN default below is a literal: SQLite rejects non-constant
-- defaults in ALTER TABLE (which is why created_at appears only in the
-- CREATE TABLE at the bottom, where (datetime('now')) is allowed).

-- ---- events: 17 columns ----
ALTER TABLE `events` ADD COLUMN `featured` integer DEFAULT false NOT NULL;
ALTER TABLE `events` ADD COLUMN `theme` text DEFAULT '' NOT NULL;
ALTER TABLE `events` ADD COLUMN `organizer` text DEFAULT 'BICTA' NOT NULL;
ALTER TABLE `events` ADD COLUMN `contact_email` text DEFAULT '' NOT NULL;
ALTER TABLE `events` ADD COLUMN `contact_phone` text DEFAULT '' NOT NULL;
ALTER TABLE `events` ADD COLUMN `emergency_contact` text DEFAULT '' NOT NULL;
ALTER TABLE `events` ADD COLUMN `entry_fee` text DEFAULT '' NOT NULL;
ALTER TABLE `events` ADD COLUMN `certificate` integer DEFAULT true NOT NULL;
ALTER TABLE `events` ADD COLUMN `language` text DEFAULT '' NOT NULL;
ALTER TABLE `events` ADD COLUMN `eligibility` text DEFAULT '' NOT NULL;
ALTER TABLE `events` ADD COLUMN `objectives` text DEFAULT '' NOT NULL;
ALTER TABLE `events` ADD COLUMN `audience` text DEFAULT '' NOT NULL;
ALTER TABLE `events` ADD COLUMN `benefits` text DEFAULT '' NOT NULL;
ALTER TABLE `events` ADD COLUMN `venue_address` text DEFAULT '' NOT NULL;
ALTER TABLE `events` ADD COLUMN `venue_directions` text DEFAULT '' NOT NULL;
ALTER TABLE `events` ADD COLUMN `venue_parking` text DEFAULT '' NOT NULL;
ALTER TABLE `events` ADD COLUMN `map_embed` text DEFAULT '' NOT NULL;

-- ---- competitions: 6 columns ----
ALTER TABLE `competitions` ADD COLUMN `banner_image` text;
ALTER TABLE `competitions` ADD COLUMN `category` text DEFAULT '' NOT NULL;
ALTER TABLE `competitions` ADD COLUMN `difficulty` text DEFAULT '' NOT NULL;
ALTER TABLE `competitions` ADD COLUMN `submission_guidelines` text DEFAULT '' NOT NULL;
ALTER TABLE `competitions` ADD COLUMN `evaluation_criteria` text DEFAULT '' NOT NULL;
ALTER TABLE `competitions` ADD COLUMN `resources` text DEFAULT '' NOT NULL;

-- ---- faqs: scoping columns (both null = site-wide question) ----
-- No REFERENCES clause: SQLite cannot add a foreign key via ALTER TABLE. The
-- old database has the same shape, and the cascade is enforced in application
-- code, so this matches production rather than diverging from it.
ALTER TABLE `faqs` ADD COLUMN `event_id` integer;
ALTER TABLE `faqs` ADD COLUMN `competition_id` integer;

-- ---- announcements: whole table, read by getEventDetail() ----
CREATE TABLE `announcements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` integer NOT NULL,
	`title` text NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`pinned` integer DEFAULT false NOT NULL,
	`published` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
