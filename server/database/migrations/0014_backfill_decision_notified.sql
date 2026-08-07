-- Backfill for decision_notified_at, added in 0013.
--
-- Before that column existed, deciding a registration emailed the team then
-- and there. Those rows therefore have a decision but a NULL sent-marker,
-- which releaseDueDecisions() reads as "never told" — so the first sweep after
-- deploying would email every previously-decided team a second time.
--
-- Stamping the existing decision time as the notification time makes the
-- marker mean what it says for historical rows. Scoped to rows that are
-- already decided, so genuinely pending announcements are untouched.
UPDATE registrations
SET decision_notified_at = decision_at
WHERE decision_notified_at IS NULL
  AND decision_at IS NOT NULL
  AND status IN ('confirmed', 'rejected');
