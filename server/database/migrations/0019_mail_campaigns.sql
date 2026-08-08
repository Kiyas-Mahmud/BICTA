-- History for the admin broadcast mailer (server/pages/admin/mailer.vue).
-- Read-only after the fact: a send cannot be un-sent, so this exists purely
-- so a later admin can see what went out, to whom, and whether every
-- recipient actually received it.
CREATE TABLE `mail_campaigns` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`subject` text NOT NULL,
	`message` text DEFAULT '' NOT NULL,
	`audience` text NOT NULL,
	`recipient_count` integer DEFAULT 0 NOT NULL,
	`sent_count` integer DEFAULT 0 NOT NULL,
	`failed_count` integer DEFAULT 0 NOT NULL,
	`sent_by_name` text DEFAULT '' NOT NULL,
	`sent_by_email` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
