-- Dynamic per-competition application forms: admin-defined fields (text/file,
-- required flag, order) and the answers a team submits against them. Scoped
-- strictly to one competition (no event-wide concept, unlike judging_criteria).
-- decision_note/decision_at on registrations record an admin's optional
-- reason when confirming or rejecting an application.

CREATE TABLE `application_fields` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`competition_id` integer NOT NULL,
	`label` text NOT NULL,
	`help_text` text DEFAULT '' NOT NULL,
	`field_type` text DEFAULT 'text' NOT NULL,
	`required` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`competition_id`) REFERENCES `competitions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `application_responses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`registration_id` integer NOT NULL,
	`field_id` integer NOT NULL,
	`text_value` text,
	`file_url` text,
	`file_name` text,
	`file_size` integer,
	`file_mime` text,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`field_id`) REFERENCES `application_fields`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `application_responses_registration_field_unique` ON `application_responses` (`registration_id`,`field_id`);
--> statement-breakpoint
ALTER TABLE `registrations` ADD `decision_note` text;
--> statement-breakpoint
ALTER TABLE `registrations` ADD `decision_at` text;
