-- Event-scoped hierarchy: check-in points per competition, volunteer and judge
-- assignments, sponsors per event. Plus the testimonials removal.
--
-- Hand-written: drizzle-kit generate needs an interactive prompt to tell a
-- dropped table apart from newly added ones, and it cannot backfill. Every
-- column added here is either nullable or has a default, so plain ALTER TABLE
-- statements are enough — no table rebuilds.
PRAGMA defer_foreign_keys = on;--> statement-breakpoint

-- 1. Check-in points gain a competition, a place, and a description.
ALTER TABLE `checkpoints` ADD `competition_id` integer REFERENCES competitions(id);--> statement-breakpoint
ALTER TABLE `checkpoints` ADD `location` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `checkpoints` ADD `description` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `checkpoints` ADD `qr_enabled` integer DEFAULT true NOT NULL;--> statement-breakpoint

-- 2. Check-ins remember which competition the pickup belonged to, so the
--    collection report can attribute event-wide desks too. Backfilled from the
--    participant's team where one exists.
ALTER TABLE `checkins` ADD `competition_id` integer REFERENCES competitions(id);--> statement-breakpoint
UPDATE `checkins` SET `competition_id` = (
  SELECT `tm`.`competition_id` FROM `team_members` `tm`
  WHERE `tm`.`account_id` = `checkins`.`account_id` LIMIT 1
);--> statement-breakpoint

-- 3. Who staffs which desk.
CREATE TABLE `checkpoint_volunteers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`checkpoint_id` integer NOT NULL,
	`admin_id` integer NOT NULL,
	FOREIGN KEY (`checkpoint_id`) REFERENCES `checkpoints`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`admin_id`) REFERENCES `admins`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE UNIQUE INDEX `checkpoint_volunteers_unique` ON `checkpoint_volunteers` (`checkpoint_id`,`admin_id`);--> statement-breakpoint

-- 4. A volunteer works one event and any number of its competitions.
CREATE TABLE `volunteer_assignments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`admin_id` integer NOT NULL,
	`event_id` integer NOT NULL,
	`competition_id` integer NOT NULL,
	FOREIGN KEY (`admin_id`) REFERENCES `admins`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`competition_id`) REFERENCES `competitions`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE UNIQUE INDEX `volunteer_assignments_unique` ON `volunteer_assignments` (`admin_id`,`competition_id`);--> statement-breakpoint

-- 5. Judges assigned to the competitions they score.
CREATE TABLE `judge_assignments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`person_id` integer NOT NULL,
	`competition_id` integer NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`competition_id`) REFERENCES `competitions`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE UNIQUE INDEX `judge_assignments_unique` ON `judge_assignments` (`person_id`,`competition_id`);--> statement-breakpoint

-- 6. Judge contact details.
ALTER TABLE `people` ADD `email` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `people` ADD `phone` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `people` ADD `expertise` text DEFAULT '' NOT NULL;--> statement-breakpoint

-- 7. Sponsors belong to an event and carry a contact. Existing rows are
--    attached to the current event so they keep showing where they show today;
--    a null event_id keeps meaning "every event".
ALTER TABLE `sponsors` ADD `event_id` integer REFERENCES events(id);--> statement-breakpoint
ALTER TABLE `sponsors` ADD `contact_person` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `sponsors` ADD `contact_email` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `sponsors` ADD `phone` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `sponsors` ADD `active` integer DEFAULT true NOT NULL;--> statement-breakpoint
UPDATE `sponsors` SET `event_id` = (SELECT `id` FROM `events` WHERE `is_current` = 1 LIMIT 1)
WHERE `event_id` IS NULL;--> statement-breakpoint

-- 8. Testimonials are gone.
DROP TABLE IF EXISTS `testimonials`;
