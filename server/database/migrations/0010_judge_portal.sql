-- Judge portal: login accounts for judges (1:1 with `people`, separate from
-- the shared non-unique people.email) and per-criterion scores. `judging_open`
-- lets an admin freeze scoring after judging ends, mirroring registration_open.

CREATE TABLE `judge_accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`person_id` integer NOT NULL,
	`email` text NOT NULL,
	`password_hash` text,
	`full_name` text NOT NULL,
	`status` text DEFAULT 'invited' NOT NULL,
	`invite_token` text,
	`invite_expires` text,
	`reset_token` text,
	`reset_expires` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `judge_accounts_person_id_unique` ON `judge_accounts` (`person_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `judge_accounts_email_unique` ON `judge_accounts` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `judge_accounts_invite_token_unique` ON `judge_accounts` (`invite_token`);--> statement-breakpoint
CREATE UNIQUE INDEX `judge_accounts_reset_token_unique` ON `judge_accounts` (`reset_token`);--> statement-breakpoint

CREATE TABLE `scores` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`registration_id` integer NOT NULL,
	`criterion_id` integer NOT NULL,
	`judge_id` integer NOT NULL,
	`competition_id` integer NOT NULL,
	`value` integer NOT NULL,
	`note` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`criterion_id`) REFERENCES `judging_criteria`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`judge_id`) REFERENCES `judge_accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`competition_id`) REFERENCES `competitions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `scores_registration_criterion_judge_unique` ON `scores` (`registration_id`,`criterion_id`,`judge_id`);--> statement-breakpoint

ALTER TABLE `competitions` ADD `judging_open` integer DEFAULT true NOT NULL;
