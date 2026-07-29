-- Adds team_members.competition_id (denormalised from the parent registration)
-- so "one team per competition per account" can be a real SQL constraint.
--
-- Hand-written rather than left as drizzle-kit's output: it emitted a plain
-- `ALTER TABLE ... ADD COLUMN NOT NULL` with no default, which SQLite refuses
-- on a table that already has rows. A table rebuild is the only way to add a
-- NOT NULL column and backfill it in one step.
PRAGMA defer_foreign_keys = on;--> statement-breakpoint
CREATE TABLE `__new_team_members` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`registration_id` integer NOT NULL,
	`competition_id` integer NOT NULL,
	`account_id` integer NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`competition_id`) REFERENCES `competitions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`account_id`) REFERENCES `participant_accounts`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `__new_team_members` (`id`, `registration_id`, `competition_id`, `account_id`, `role`, `created_at`)
SELECT `tm`.`id`, `tm`.`registration_id`, `r`.`competition_id`, `tm`.`account_id`, `tm`.`role`, `tm`.`created_at`
FROM `team_members` `tm`
JOIN `registrations` `r` ON `r`.`id` = `tm`.`registration_id`;--> statement-breakpoint
DROP TABLE `team_members`;--> statement-breakpoint
ALTER TABLE `__new_team_members` RENAME TO `team_members`;--> statement-breakpoint
CREATE UNIQUE INDEX `team_members_registration_account_unique` ON `team_members` (`registration_id`,`account_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `team_members_competition_account_unique` ON `team_members` (`competition_id`,`account_id`);
