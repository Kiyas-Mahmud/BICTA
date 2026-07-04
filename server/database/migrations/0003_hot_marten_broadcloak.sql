CREATE TABLE `checkins` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer NOT NULL,
	`checkpoint_id` integer NOT NULL,
	`scanned_by` integer,
	`collected_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `participant_accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`checkpoint_id`) REFERENCES `checkpoints`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`scanned_by`) REFERENCES `admins`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `checkins_account_checkpoint_unique` ON `checkins` (`account_id`,`checkpoint_id`);--> statement-breakpoint
CREATE TABLE `checkpoints` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` integer NOT NULL,
	`name` text NOT NULL,
	`icon` text,
	`active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `participant_accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`password_hash` text,
	`full_name` text NOT NULL,
	`phone` text,
	`status` text DEFAULT 'invited' NOT NULL,
	`invite_token` text,
	`reset_token` text,
	`reset_expires` text,
	`checkin_token` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `participant_accounts_email_unique` ON `participant_accounts` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `participant_accounts_invite_token_unique` ON `participant_accounts` (`invite_token`);--> statement-breakpoint
CREATE UNIQUE INDEX `participant_accounts_reset_token_unique` ON `participant_accounts` (`reset_token`);--> statement-breakpoint
CREATE UNIQUE INDEX `participant_accounts_checkin_token_unique` ON `participant_accounts` (`checkin_token`);--> statement-breakpoint
CREATE TABLE `team_members` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`registration_id` integer NOT NULL,
	`account_id` integer NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`account_id`) REFERENCES `participant_accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `team_members_registration_account_unique` ON `team_members` (`registration_id`,`account_id`);--> statement-breakpoint
ALTER TABLE `admins` ADD `role` text DEFAULT 'admin' NOT NULL;