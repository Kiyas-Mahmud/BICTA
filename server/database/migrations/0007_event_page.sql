-- Event details page (2026-07 spec): tagline/type/publish state, countdown
-- config, per-event section settings, event-level prizes, hour-by-hour
-- schedule, judging criteria. Hand-written: every column nullable or
-- constant-defaulted, so plain ALTERs are safe on populated tables.

ALTER TABLE `events` ADD `tagline` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `event_type` text DEFAULT 'offline' NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `published` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `countdown_mode` text DEFAULT 'start' NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `countdown_at` text;--> statement-breakpoint
ALTER TABLE `events` ADD `meeting_info` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `sections` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `seo_description` text DEFAULT '' NOT NULL;--> statement-breakpoint

CREATE TABLE `event_prizes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` integer NOT NULL,
	`title` text NOT NULL,
	`amount` text DEFAULT '' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`highlight` integer DEFAULT false NOT NULL,
	`published` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint

CREATE TABLE `schedule_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` integer NOT NULL,
	`competition_id` integer,
	`date` text,
	`start_time` text DEFAULT '' NOT NULL,
	`end_time` text DEFAULT '' NOT NULL,
	`title` text NOT NULL,
	`session_type` text DEFAULT '' NOT NULL,
	`venue` text DEFAULT '' NOT NULL,
	`speaker` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`published` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`competition_id`) REFERENCES `competitions`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint

CREATE TABLE `judging_criteria` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` integer NOT NULL,
	`competition_id` integer,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`weight` integer DEFAULT 0 NOT NULL,
	`icon` text,
	`published` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`competition_id`) REFERENCES `competitions`(`id`) ON UPDATE no action ON DELETE cascade
);
