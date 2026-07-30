-- Winners gain an edition link so the admin can filter them by event, the same
-- way sponsors and judges already can. Nullable: rows that only recorded a year
-- stay valid, and the backfill below matches them up where the year is enough
-- to identify one edition.

ALTER TABLE `winners` ADD `event_id` integer REFERENCES events(id) ON DELETE set null;--> statement-breakpoint

UPDATE `winners`
SET `event_id` = (
  SELECT e.id FROM `events` e
  WHERE e.year = `winners`.`year`
  LIMIT 1
)
WHERE `event_id` IS NULL AND `year` IS NOT NULL;
