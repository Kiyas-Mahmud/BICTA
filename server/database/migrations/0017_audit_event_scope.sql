-- Let the activity log be filtered by event.
--
-- audit_logs has only a loose (entity, entityId) pointer and no FK, so an
-- event could not be derived at read time — especially for deletes, where the
-- target row is gone. Recording it at WRITE time is the only way to get it
-- right going forward.
ALTER TABLE audit_logs ADD COLUMN event_id INTEGER REFERENCES events(id) ON DELETE SET NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS audit_logs_event_idx ON audit_logs (event_id, created_at);
--> statement-breakpoint

-- Backfill what is still resolvable. Competitions carry an eventId directly;
-- registrations reach one through their competition.
UPDATE audit_logs
SET event_id = (SELECT c.event_id FROM competitions c WHERE c.id = audit_logs.entity_id)
WHERE event_id IS NULL AND entity = 'competition' AND entity_id IS NOT NULL;
--> statement-breakpoint

UPDATE audit_logs
SET event_id = (
  SELECT c.event_id FROM registrations r
  JOIN competitions c ON c.id = r.competition_id
  WHERE r.id = audit_logs.entity_id
)
WHERE event_id IS NULL AND entity = 'registration' AND entity_id IS NOT NULL;

-- Everything else stays NULL and is treated as console-wide. That is honest:
-- moderator/settings/login actions genuinely have no event, and a deleted
-- row's event can no longer be looked up. The UI labels these rather than
-- implying the history is complete.
