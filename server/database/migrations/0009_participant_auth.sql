-- Auth hardening: email verification for leaders (new `pending` status between
-- self-registration and confirmed inbox ownership) and expiry on invite links
-- (mirrors the reset-token expiry that already existed). Hand-written: SQLite
-- text columns have no enum constraint, so widening `status` to include
-- 'pending' needs no ALTER — only the new nullable columns do.

ALTER TABLE `participant_accounts` ADD `invite_expires` text;--> statement-breakpoint
ALTER TABLE `participant_accounts` ADD `email_verify_token` text;--> statement-breakpoint
ALTER TABLE `participant_accounts` ADD `email_verify_expires` text;--> statement-breakpoint
CREATE UNIQUE INDEX `participant_accounts_email_verify_token_unique` ON `participant_accounts` (`email_verify_token`);
