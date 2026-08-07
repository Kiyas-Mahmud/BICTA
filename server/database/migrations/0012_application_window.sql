-- Application form settings, per competition.
-- application_required: the form must be completed to register (vs. filled in
-- later from the participant dashboard).
-- application_opens_at / application_closes_at: optional submission window.
-- A null close date falls back to the competition's registration_deadline.
ALTER TABLE competitions ADD COLUMN application_required INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE competitions ADD COLUMN application_opens_at TEXT;
--> statement-breakpoint
ALTER TABLE competitions ADD COLUMN application_closes_at TEXT;
