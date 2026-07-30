-- Replaces every event and everything hanging off it with a fresh, fully
-- populated set. Destructive by design: registrations and team rosters belong
-- to competitions, so they go with them. Participant accounts survive.
--
--   npx wrangler d1 execute bicta --local  --file scripts/reseed-events.sql
--   npx wrangler d1 execute bicta --remote --file scripts/reseed-events.sql

DELETE FROM checkins;
DELETE FROM checkpoint_volunteers;
DELETE FROM checkpoints;
DELETE FROM team_members;
DELETE FROM registrations;
DELETE FROM judge_assignments;
DELETE FROM volunteer_assignments;
DELETE FROM judging_criteria;
DELETE FROM schedule_items;
DELETE FROM event_prizes;
DELETE FROM announcements;
DELETE FROM timeline_milestones;
DELETE FROM gallery_images;
DELETE FROM prizes;
DELETE FROM competitions;
DELETE FROM faqs WHERE event_id IS NOT NULL OR competition_id IS NOT NULL;
DELETE FROM sponsors;
DELETE FROM events;

-- ---------- Events ----------
INSERT INTO events (
  id, title, year, slug, description, start_date, end_date, venue, hero_image, status, is_current,
  featured, theme, organizer, contact_email, contact_phone, emergency_contact, entry_fee, certificate,
  language, eligibility, objectives, audience, benefits, venue_address, venue_directions, venue_parking,
  map_embed, tagline, event_type, published, countdown_mode, countdown_at, meeting_info, sections, seo_description
) VALUES
(1, 'BICTA 2026', 2026, 'bicta-2026',
 '<p>The national ICT programming festival returns for its biggest edition yet. Five competition segments, a record prize pool, and a national stage for student builders from every corner of Bangladesh.</p><p>Over three days you will build, pitch and defend your work in front of a panel of industry judges, with mentorship and workshops running alongside every track.</p>',
 '2026-09-10', '2026-09-12', 'Bangabandhu International Conference Center',
 '/gallery-images/hackathons.jpg', 'upcoming', 1,
 1, 'Build for a resilient Bangladesh', 'BICTA Foundation',
 'events@bicta.org', '+880 1700 000000', 'Control room +880 1800 111222',
 'Free for all students', 1, 'Bangla and English',
 'Open to all undergraduate and diploma students enrolled in a Bangladeshi institution.',
 'Grow the national tech talent pipeline
Connect students directly with industry hiring teams
Turn academic projects into products people use
Celebrate the best student engineering in the country',
 'Students, recent graduates, and early-career developers, designers and data scientists.',
 'Certificate for every participant
Prize pool of 465,000 BDT across five segments
Mentorship from working engineers throughout the event
Interview fast-track with partner companies
Meals and a participant kit on all three days',
 'Agargaon, Sher-E-Bangla Nagar, Dhaka 1207, Bangladesh',
 'Ten minutes from Agargaon metro station (MRT Line 6). City buses on Rokeya Sarani stop directly outside gate 1.',
 'Free on-site parking behind the main hall, entry via gate 2. Space is limited on finals day.',
 '', 'Innovate. Code. Compete. Inspire.', 'offline', 1, 'start', NULL, '', '',
 'BICTA 2026, the national ICT programming festival. Five competition segments, 465,000 BDT in prizes, Dhaka, 10 to 12 September 2026.'),

(2, 'BICTA 2025', 2025, 'bicta-2025',
 '<p>Our 2025 edition brought together more than 400 builders across two tracks, with the finals broadcast live from Dhaka.</p>',
 '2025-09-11', '2025-09-13', 'Bangabandhu International Conference Center',
 '/gallery-images/photo-1688733720228-4f7a18681c4f.avif', 'past', 0,
 0, 'Code for the country', 'BICTA Foundation',
 'events@bicta.org', '', '', 'Free', 1, 'Bangla and English',
 'Open to all undergraduate students.', '', '', '',
 'Agargaon, Sher-E-Bangla Nagar, Dhaka 1207, Bangladesh', '', '',
 '', 'Four hundred builders. Three champions.', 'offline', 1, 'off', NULL, '', '',
 'Highlights from BICTA 2025: 400+ participants, two tracks, three champion teams.');

-- ---------- Competitions ----------
INSERT INTO competitions (
  id, event_id, name, slug, type, description, rules, registration_open, registration_deadline,
  team_based, max_team_size, cover_image, banner_image, category, difficulty,
  submission_guidelines, evaluation_criteria, resources, sort_order
) VALUES
(1, 1, 'Hackathon', 'hackathon-2026', 'Hackathon',
 '<p>Thirty-six hours to take an idea from a blank repository to a working prototype built around this year''s theme.</p>',
 '<ul><li>Teams of two to five members.</li><li>All code must be written during the event window.</li><li>Open-source libraries are allowed and must be credited.</li><li>You keep full ownership of what you build.</li></ul>',
 1, '2026-08-25', 1, 5,
 '/gallery-images/hackathons.jpg', '/gallery-images/hackathons.jpg',
 'Software', 'intermediate',
 '<p>Push your work to a public repository and submit the link, plus a three-minute demo video and a one-page write-up describing the problem and your approach.</p>',
 '<p>Judges score against innovation, technical depth, real-world impact and the quality of your live pitch.</p>',
 '<ul><li>Starter templates and the theme brief are published one week before kickoff.</li><li>Mentors are on the floor for the full thirty-six hours.</li></ul>',
 0),

(2, 1, 'Datathon', 'datathon-2026', 'Datathon',
 '<p>Forty-eight hours, one national dataset. Build the strongest model and tell the clearest story with what you find.</p>',
 '<ul><li>Teams of up to three members.</li><li>External data is allowed if it is publicly available and cited.</li><li>Submissions are scored on a held-out test set.</li></ul>',
 1, '2026-08-25', 1, 3,
 '/gallery-images/photo-1624996752380-8ec242e0f85d.avif', '/gallery-images/photo-1624996752380-8ec242e0f85d.avif',
 'Data Science', 'advanced',
 '<p>Submit your notebook, your predictions file, and a short report explaining your feature engineering and model choices.</p>',
 '<p>Half of your score comes from leaderboard accuracy, half from the clarity and honesty of your analysis.</p>',
 '<ul><li>The training dataset and a baseline notebook are released at kickoff.</li><li>Compute credits are provided by our technology partner.</li></ul>',
 1),

(3, 1, 'Project Showcase', 'project-showcase-2026', 'Showcase',
 '<p>Bring the project you have already built and defend it in front of a panel of industry engineers.</p>',
 '<ul><li>Teams of one to four members.</li><li>The project must be your own original work.</li><li>Projects submitted to a previous BICTA edition are not eligible.</li></ul>',
 1, '2026-08-20', 1, 4,
 '/gallery-images/images (1).jpg', '/gallery-images/images (1).jpg',
 'Software', 'beginner',
 '<p>Submit a live demo link or a runnable build, your source repository, and a poster in PDF form for the exhibition floor.</p>',
 '<p>Scored on originality, engineering quality, completeness and how well you handle questions from the panel.</p>',
 '<ul><li>Poster templates are available from the participant dashboard.</li><li>Exhibition tables and power are provided on the day.</li></ul>',
 2),

(4, 1, 'Programming Contest', 'programming-contest-2026', 'Competitive Programming',
 '<p>A five-hour ICPC-style contest. Ten problems, one machine per team, ranked by problems solved and time penalty.</p>',
 '<ul><li>Teams of exactly three members.</li><li>One computer per team.</li><li>Printed reference material is allowed; the internet is not.</li></ul>',
 1, '2026-08-30', 1, 3,
 '/gallery-images/images (2).jpg', '/gallery-images/images (2).jpg',
 'Competitive Programming', 'advanced',
 '<p>Submissions go through the on-site judge. The final standings freeze for the last hour.</p>',
 '<p>Ranked strictly by the number of problems solved, with cumulative time as the tie-breaker.</p>',
 '<ul><li>A practice contest opens two days before the event.</li><li>The judge runs C++17, Java 17 and Python 3.11.</li></ul>',
 3),

(5, 1, 'Cybersecurity Challenge', 'cybersecurity-challenge-2026', 'Capture the Flag',
 '<p>A jeopardy-style capture the flag across web exploitation, reverse engineering, forensics and cryptography.</p>',
 '<ul><li>Teams of up to four members.</li><li>Attacking the scoring infrastructure means immediate disqualification.</li><li>Flag sharing between teams is disqualifying for everyone involved.</li></ul>',
 1, '2026-08-30', 1, 4,
 '/gallery-images/images (3).jpg', '/gallery-images/images (3).jpg',
 'Security', 'advanced',
 '<p>Submit flags through the scoreboard as you capture them. Write-ups for the three hardest challenges are due within 24 hours of the close.</p>',
 '<p>Ranked by points, with first-blood bonuses and the quality of your write-ups as tie-breakers.</p>',
 '<ul><li>A practice range with retired challenges opens one week early.</li><li>Bring your own laptop with a virtual machine ready.</li></ul>',
 4),

(6, 2, 'Hackathon', 'hackathon-2025', 'Hackathon',
 '<p>The 2025 hackathon track, won by Team Kernel Panic with a flood early-warning system.</p>',
 '<ul><li>Teams of up to five.</li></ul>', 0, '2025-08-20', 1, 5,
 '/gallery-images/images (4).jpg', NULL, 'Software', 'intermediate', '', '', '', 0),

(7, 2, 'Project Showcase', 'project-showcase-2025', 'Showcase',
 '<p>The 2025 showcase floor, with 60 projects exhibited over two days.</p>',
 '<ul><li>Teams of up to four.</li></ul>', 0, '2025-08-20', 1, 4,
 '/gallery-images/images.jpg', NULL, 'Software', 'beginner', '', '', '', 1);

-- ---------- Competition prizes ----------
INSERT INTO prizes (competition_id, position, amount, note, sort_order) VALUES
(1, 'Champion', '120,000 BDT', 'Plus interview fast-track with partner companies', 0),
(1, '1st Runner-up', '60,000 BDT', NULL, 1),
(1, '2nd Runner-up', '30,000 BDT', NULL, 2),
(2, 'Champion', '100,000 BDT', 'Plus compute credits from our technology partner', 0),
(2, '1st Runner-up', '50,000 BDT', NULL, 1),
(2, '2nd Runner-up', '25,000 BDT', NULL, 2),
(3, 'Champion', '60,000 BDT', NULL, 0),
(3, '1st Runner-up', '30,000 BDT', NULL, 1),
(4, 'Champion', '80,000 BDT', NULL, 0),
(4, '1st Runner-up', '40,000 BDT', NULL, 1),
(5, 'Champion', '70,000 BDT', NULL, 0),
(5, '1st Runner-up', '35,000 BDT', NULL, 1);

-- ---------- Event prize pool ----------
INSERT INTO event_prizes (event_id, title, amount, note, highlight, published, sort_order) VALUES
(1, 'Grand Champion', '150,000 BDT', 'Awarded to the strongest overall team across all five segments', 1, 1, 0),
(1, 'Segment Champions', '430,000 BDT', 'Combined across the five competition segments', 0, 1, 1),
(1, 'Best Female-Led Team', '40,000 BDT', 'Open to teams with a female team leader', 0, 1, 2),
(1, 'Best First-Year Team', '25,000 BDT', 'For teams where every member is in their first year', 0, 1, 3),
(1, 'Certificates', 'Every participant', 'Digital certificate issued through the participant dashboard', 0, 1, 4),
(1, 'Internship Fast-Track', 'Top 20 teams', 'Direct interview round with partner companies', 0, 1, 5);

-- ---------- Milestone timeline ----------
INSERT INTO timeline_milestones (event_id, label, date, note, sort_order) VALUES
(1, 'Registration opens', '2026-07-01', 'Sign up for any of the five segments.', 0),
(1, 'Team formation deadline', '2026-08-15', 'Lock in your roster before the cut-off.', 1),
(1, 'Registration closes', '2026-08-30', 'Last day to register for any segment.', 2),
(1, 'Orientation session', '2026-09-05', 'Online briefing covering rules and judging.', 3),
(1, 'Opening ceremony', '2026-09-10', 'Kickoff in Dhaka.', 4),
(1, 'Finals and award ceremony', '2026-09-12', 'Winners announced on the main stage.', 5),
(2, 'Registration opened', '2025-07-01', NULL, 0),
(2, 'Finals and awards', '2025-09-13', 'Team Kernel Panic took the championship.', 1);

-- ---------- Programme schedule ----------
INSERT INTO schedule_items (event_id, competition_id, date, start_time, end_time, title, session_type, venue, speaker, description, published, sort_order) VALUES
(1, NULL, '2026-09-10', '08:30', '10:00', 'Participant check-in', 'Registration', 'Main lobby', '', 'Collect your kit, badge and QR code.', 1, 0),
(1, NULL, '2026-09-10', '10:00', '11:00', 'Opening ceremony', 'Ceremony', 'Main auditorium', 'Chief Guest', 'Welcome address and the reveal of this year''s theme.', 1, 1),
(1, 1, '2026-09-10', '11:30', '12:00', 'Hackathon kickoff', 'Briefing', 'Hall A', 'Track lead', 'Rules, judging and the thirty-six hour clock starts.', 1, 2),
(1, 2, '2026-09-10', '11:30', '12:00', 'Datathon dataset release', 'Briefing', 'Hall B', 'Track lead', 'Dataset walkthrough and baseline notebook.', 1, 3),
(1, NULL, '2026-09-10', '13:00', '14:00', 'Lunch', 'Break', 'Dining hall', '', '', 1, 4),
(1, NULL, '2026-09-10', '15:00', '16:30', 'Workshop: shipping under pressure', 'Workshop', 'Hall C', 'Industry mentor', 'Practical patterns for building fast without breaking everything.', 1, 5),
(1, 4, '2026-09-11', '09:00', '14:00', 'Programming contest', 'Round', 'Lab 1 and Lab 2', '', 'Five hours, ten problems, frozen scoreboard for the final hour.', 1, 0),
(1, 5, '2026-09-11', '10:00', '18:00', 'Capture the flag', 'Round', 'Lab 3', '', 'Jeopardy-style challenges across four categories.', 1, 1),
(1, NULL, '2026-09-11', '13:00', '14:00', 'Lunch', 'Break', 'Dining hall', '', '', 1, 2),
(1, 3, '2026-09-11', '15:00', '18:00', 'Project showcase exhibition', 'Exhibition', 'Exhibition floor', '', 'Open to the public. Judges circulate throughout.', 1, 3),
(1, NULL, '2026-09-12', '09:00', '12:00', 'Final presentations', 'Judging', 'Main auditorium', '', 'Shortlisted teams pitch to the full panel.', 1, 0),
(1, NULL, '2026-09-12', '13:00', '14:30', 'Keynote and partner showcase', 'Keynote', 'Main auditorium', 'Guest speaker', '', 1, 1),
(1, NULL, '2026-09-12', '16:00', '18:00', 'Award ceremony', 'Ceremony', 'Main auditorium', '', 'Champions announced across every segment.', 1, 2);

-- ---------- Judging criteria ----------
INSERT INTO judging_criteria (event_id, competition_id, name, description, weight, icon, published, sort_order) VALUES
(1, NULL, 'Innovation', 'How original is the idea, and does it approach the problem in a way we have not seen before?', 25, 'lucide:lightbulb', 1, 0),
(1, NULL, 'Technical implementation', 'Engineering quality, correctness, and how much actually works end to end.', 25, 'lucide:code', 1, 1),
(1, NULL, 'Real-world impact', 'Who benefits, how many of them, and how plausible is adoption?', 20, 'lucide:heart-handshake', 1, 2),
(1, NULL, 'Feasibility', 'Could this survive outside the event with a realistic amount of work?', 15, 'lucide:route', 1, 3),
(1, NULL, 'Presentation', 'Clarity of the pitch and how well the team handles questions.', 15, 'lucide:presentation', 1, 4),
(1, 2, 'Model accuracy', 'Score on the held-out test set.', 50, 'lucide:target', 1, 0),
(1, 2, 'Analysis quality', 'Feature engineering, validation strategy, and honesty about limitations.', 30, 'lucide:chart-line', 1, 1),
(1, 2, 'Storytelling', 'How clearly the findings are communicated to a non-technical reader.', 20, 'lucide:book-open', 1, 2),
(1, 5, 'Points captured', 'Total challenge points on the scoreboard.', 70, 'lucide:flag', 1, 0),
(1, 5, 'Write-up quality', 'Clarity and reproducibility of the submitted write-ups.', 30, 'lucide:file-text', 1, 1);

-- ---------- Event FAQs ----------
INSERT INTO faqs (event_id, competition_id, question, answer, sort_order) VALUES
(1, NULL, 'Can I take part in more than one segment?', '<p>Yes. You may enter as many segments as you like, as long as you are in only one team per segment and the schedules do not clash. Register for each segment separately.</p>', 0),
(1, NULL, 'Is there a registration fee?', '<p>No. BICTA 2026 is free for every participant, including meals and the participant kit.</p>', 1),
(1, NULL, 'What should I bring?', '<p>Your laptop, charger, student ID and the QR code from your participant dashboard. Everything else is provided.</p>', 2),
(1, NULL, 'Can my team change after registration?', '<p>Team leaders can edit the roster from the participant dashboard until the team formation deadline on 15 August. After that, changes need organiser approval.</p>', 3),
(1, NULL, 'Will I get a certificate?', '<p>Yes. Every participant who checks in receives a digital certificate through the participant dashboard after the event.</p>', 4),
(1, 4, 'What languages does the judge support?', '<p>C++17, Java 17 and Python 3.11. The practice contest uses exactly the same configuration.</p>', 0),
(1, 5, 'Do I need my own virtual machine?', '<p>Yes. Bring a laptop with a Linux VM ready. We provide network access and power, not machines.</p>', 0);

-- ---------- Announcements ----------
INSERT INTO announcements (event_id, title, body, pinned, published, created_at) VALUES
(1, 'Registration is now open', '<p>All five segments are accepting entries. Registration closes on <strong>30 August 2026</strong>, and the team formation deadline is 15 August.</p>', 1, 1, '2026-07-01 09:00:00'),
(1, 'Theme reveal moved to the opening ceremony', '<p>This year the theme stays sealed until the opening ceremony on 10 September, so every team starts at the same moment.</p>', 0, 1, '2026-07-20 12:00:00'),
(1, 'Two new segments added', '<p>The Programming Contest and Cybersecurity Challenge join the line-up this year, taking the total prize pool to 465,000 BDT.</p>', 0, 1, '2026-07-25 10:30:00');

-- ---------- Sponsors ----------
INSERT INTO sponsors (event_id, name, logo_url, website_url, tier, contact_person, contact_email, phone, active, sort_order) VALUES
(1, 'TechCorp', NULL, 'https://example.com', 'Title Sponsor', 'Nusrat Jahan', 'partners@techcorp.example', '', 1, 0),
(1, 'DataWorks', NULL, 'https://example.com', 'Platinum Sponsor', 'Rafiq Islam', 'hello@dataworks.example', '', 1, 1),
(1, 'CloudBD', NULL, 'https://example.com', 'Gold Sponsor', '', '', '', 1, 2),
(1, 'SecureNet', NULL, 'https://example.com', 'Gold Sponsor', '', '', '', 1, 3),
(1, 'StartupHub', NULL, 'https://example.com', 'Community Partner', '', '', '', 1, 4),
(NULL, 'Daffodil International University', NULL, 'https://example.com', 'Venue Partner', '', '', '', 1, 5);

-- ---------- Gallery ----------
INSERT INTO gallery_images (event_id, url, caption, sort_order) VALUES
(1, '/gallery-images/hackathons.jpg', 'Hackathon floor, day one', 0),
(1, '/gallery-images/images (1).jpg', 'Project showcase exhibition', 1),
(1, '/gallery-images/images (2).jpg', 'Programming contest hall', 2),
(1, '/gallery-images/images (3).jpg', 'Mentors on the floor', 3),
(2, '/gallery-images/images (4).jpg', 'BICTA 2025 opening ceremony', 0),
(2, '/gallery-images/images.jpg', 'BICTA 2025 award ceremony', 1),
(2, '/gallery-images/photo-1688733720228-4f7a18681c4f.avif', 'BICTA 2025 finalists', 2);

-- ---------- Check-in points for the current edition ----------
INSERT INTO checkpoints (event_id, competition_id, name, location, description, icon, qr_enabled, active, sort_order) VALUES
(1, NULL, 'Participant kit', 'Main lobby', 'T-shirt, badge and welcome pack.', 'lucide:package', 1, 1, 0),
(1, NULL, 'Day 1 lunch', 'Dining hall', 'Lunch service on 10 September.', 'lucide:utensils', 1, 1, 1),
(1, NULL, 'Day 2 lunch', 'Dining hall', 'Lunch service on 11 September.', 'lucide:utensils', 1, 1, 2),
(1, NULL, 'Snack counter', 'Hall A foyer', 'Available throughout the event.', 'lucide:coffee', 1, 1, 3);
