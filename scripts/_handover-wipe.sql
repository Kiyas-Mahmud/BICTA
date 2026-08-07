-- Client handover: remove every seeded/test record, keep the operator account
-- and the branding the owner configured. Children first, so the delete order
-- is correct regardless of whether FK cascades are enforced.

-- Participation and event-day data
DELETE FROM checkins;
--> statement-breakpoint
DELETE FROM scores;
--> statement-breakpoint
DELETE FROM application_responses;
--> statement-breakpoint
DELETE FROM application_fields;
--> statement-breakpoint
DELETE FROM team_members;
--> statement-breakpoint
DELETE FROM registrations;
--> statement-breakpoint
DELETE FROM participant_accounts;
--> statement-breakpoint

-- Judges
DELETE FROM judge_assignments;
--> statement-breakpoint
DELETE FROM judge_accounts;
--> statement-breakpoint
DELETE FROM people;
--> statement-breakpoint

-- Event-day configuration
DELETE FROM checkpoint_volunteers;
--> statement-breakpoint
DELETE FROM volunteer_assignments;
--> statement-breakpoint
DELETE FROM checkpoints;
--> statement-breakpoint
DELETE FROM judging_criteria;
--> statement-breakpoint

-- Event content
DELETE FROM prizes;
--> statement-breakpoint
DELETE FROM event_prizes;
--> statement-breakpoint
DELETE FROM schedule_items;
--> statement-breakpoint
DELETE FROM gallery_images;
--> statement-breakpoint
DELETE FROM timeline_milestones;
--> statement-breakpoint
DELETE FROM announcements;
--> statement-breakpoint
DELETE FROM faqs;
--> statement-breakpoint
DELETE FROM sponsors;
--> statement-breakpoint
DELETE FROM winners;
--> statement-breakpoint
DELETE FROM competitions;
--> statement-breakpoint
DELETE FROM events;
--> statement-breakpoint

-- Site content
DELETE FROM home_features;
--> statement-breakpoint
DELETE FROM how_it_works_steps;
--> statement-breakpoint
DELETE FROM news;
--> statement-breakpoint
DELETE FROM newsletter_subscribers;
--> statement-breakpoint
DELETE FROM contact_messages;
--> statement-breakpoint

-- Test activity history
DELETE FROM audit_logs;
--> statement-breakpoint

-- Test staff. Keeps every role='admin' row so console access is never lost.
DELETE FROM admins WHERE role <> 'admin';
--> statement-breakpoint

-- Seeded placeholders. Branding the owner set (brand_name, hero_full_name,
-- site_logo_url) and the generic section headings are deliberately kept —
-- they are editable defaults, not fake records. hero_logo_url goes because
-- that feature was removed from the product.
DELETE FROM site_settings WHERE key IN (
  'venue_name', 'venue_address', 'venue_directions', 'venue_map_embed',
  'contact_email', 'facebook_url', 'linkedin_url',
  'hero_blurb', 'hero_tagline', 'hero_eyebrow', 'footer_text',
  'stat_participants', 'stat_teams', 'stat_universities',
  'hero_logo_url',
  'privacy_policy', 'terms_conditions'
);
--> statement-breakpoint

-- Restart ids at 1 for every emptied table, so the client's first event is
-- event #1 rather than #4. admins is excluded: its surviving row keeps its id.
DELETE FROM sqlite_sequence WHERE name <> 'admins';
