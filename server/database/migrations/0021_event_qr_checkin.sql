-- Per-event switch for QR check-in: the entry QR scanned at the door, kit
-- desk, food and any other checkpoint. Off means no QR is issued, emailed or
-- shown, and no scan is accepted.
--
-- Its own column rather than something read off event_type: an in-person event
-- may run no desks at all, and a hybrid one may still scan its on-site
-- attendees. Defaults to 1 so every existing event keeps working unchanged.
ALTER TABLE `events` ADD `qr_check_in` integer DEFAULT 1 NOT NULL;
