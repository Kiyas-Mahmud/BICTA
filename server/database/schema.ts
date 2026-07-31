import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const events = sqliteTable('events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  year: integer('year').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description').notNull().default(''),
  startDate: text('start_date'),
  endDate: text('end_date'),
  venue: text('venue'),
  heroImage: text('hero_image'),
  status: text('status', { enum: ['upcoming', 'ongoing', 'past'] }).notNull().default('upcoming'),
  isCurrent: integer('is_current', { mode: 'boolean' }).notNull().default(false),
  // Promoted on the home page's Featured Events rail.
  featured: integer('featured', { mode: 'boolean' }).notNull().default(false),
  theme: text('theme').notNull().default(''),
  organizer: text('organizer').notNull().default('BICTA'),
  contactEmail: text('contact_email').notNull().default(''),
  contactPhone: text('contact_phone').notNull().default(''),
  emergencyContact: text('emergency_contact').notNull().default(''),
  entryFee: text('entry_fee').notNull().default(''),
  certificate: integer('certificate', { mode: 'boolean' }).notNull().default(true),
  language: text('language').notNull().default(''),
  eligibility: text('eligibility').notNull().default(''),
  objectives: text('objectives').notNull().default(''),
  audience: text('audience').notNull().default(''),
  benefits: text('benefits').notNull().default(''),
  venueAddress: text('venue_address').notNull().default(''),
  venueDirections: text('venue_directions').notNull().default(''),
  venueParking: text('venue_parking').notNull().default(''),
  mapEmbed: text('map_embed').notNull().default(''),
  // ---- Event page (spec 2026-07) ----
  tagline: text('tagline').notNull().default(''),
  eventType: text('event_type', { enum: ['offline', 'online', 'hybrid'] }).notNull().default('offline'),
  // Draft events are visible only in admin; the public site 404s them.
  published: integer('published', { mode: 'boolean' }).notNull().default(true),
  // Hero countdown: what it counts to. 'off' hides it.
  countdownMode: text('countdown_mode', { enum: ['start', 'deadline', 'custom', 'off'] }).notNull().default('start'),
  countdownAt: text('countdown_at'),
  meetingInfo: text('meeting_info').notNull().default(''),
  // JSON: per-event section visibility + heading overrides,
  // e.g. {"prizes":{"visible":false},"about":{"heading":"The story"}}.
  sections: text('sections').notNull().default(''),
  seoDescription: text('seo_description').notNull().default(''),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
})

// Event-level prize pool (champion, runners-up, special awards). Competition
// prizes stay in `prizes` keyed by competition.
export const eventPrizes = sqliteTable('event_prizes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  eventId: integer('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  amount: text('amount').notNull().default(''),
  note: text('note').notNull().default(''),
  highlight: integer('highlight', { mode: 'boolean' }).notNull().default(false),
  published: integer('published', { mode: 'boolean' }).notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
})

// Hour-by-hour programme, distinct from the milestone timeline.
export const scheduleItems = sqliteTable('schedule_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  eventId: integer('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  // null = applies to the whole event, set = one segment's session.
  competitionId: integer('competition_id').references(() => competitions.id, { onDelete: 'cascade' }),
  date: text('date'),
  startTime: text('start_time').notNull().default(''),
  endTime: text('end_time').notNull().default(''),
  title: text('title').notNull(),
  sessionType: text('session_type').notNull().default(''),
  venue: text('venue').notNull().default(''),
  speaker: text('speaker').notNull().default(''),
  description: text('description').notNull().default(''),
  published: integer('published', { mode: 'boolean' }).notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
})

// Judging criteria; event-wide when competitionId is null, else per segment.
export const judgingCriteria = sqliteTable('judging_criteria', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  eventId: integer('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  competitionId: integer('competition_id').references(() => competitions.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  weight: integer('weight').notNull().default(0),
  icon: text('icon'),
  published: integer('published', { mode: 'boolean' }).notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const competitions = sqliteTable('competitions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  eventId: integer('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  type: text('type').notNull().default(''),
  description: text('description').notNull().default(''),
  rules: text('rules').notNull().default(''),
  registrationOpen: integer('registration_open', { mode: 'boolean' }).notNull().default(false),
  registrationDeadline: text('registration_deadline'),
  // Freezes judge score-writes when off, mirroring registrationOpen. Reading
  // scores/leaderboard is never gated by this — only the write endpoint checks it.
  judgingOpen: integer('judging_open', { mode: 'boolean' }).notNull().default(true),
  teamBased: integer('team_based', { mode: 'boolean' }).notNull().default(false),
  maxTeamSize: integer('max_team_size').notNull().default(1),
  coverImage: text('cover_image'),
  bannerImage: text('banner_image'),
  category: text('category').notNull().default(''),
  difficulty: text('difficulty').notNull().default(''),
  submissionGuidelines: text('submission_guidelines').notNull().default(''),
  evaluationCriteria: text('evaluation_criteria').notNull().default(''),
  resources: text('resources').notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const prizes = sqliteTable('prizes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  competitionId: integer('competition_id').notNull().references(() => competitions.id, { onDelete: 'cascade' }),
  position: text('position').notNull(),
  amount: text('amount').notNull(),
  note: text('note'),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const registrations = sqliteTable(
  'registrations',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    competitionId: integer('competition_id').notNull().references(() => competitions.id, { onDelete: 'cascade' }),
    fullName: text('full_name').notNull(),
    email: text('email').notNull(),
    phone: text('phone').notNull(),
    institution: text('institution').notNull().default(''),
    teamName: text('team_name'),
    teamMembers: text('team_members', { mode: 'json' }).$type<{ name: string; email: string }[]>(),
    notes: text('notes'),
    status: text('status', { enum: ['pending', 'confirmed', 'rejected'] }).notNull().default('pending'),
    createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  },
  (t) => [uniqueIndex('registrations_competition_email_unique').on(t.competitionId, t.email)],
)

export const news = sqliteTable('news', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  excerpt: text('excerpt').notNull().default(''),
  content: text('content').notNull().default(''),
  coverImage: text('cover_image'),
  status: text('status', { enum: ['draft', 'published'] }).notNull().default('draft'),
  publishedAt: text('published_at'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
})

export const galleryImages = sqliteTable('gallery_images', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  eventId: integer('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  caption: text('caption'),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const homeFeatures = sqliteTable('home_features', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  body: text('body').notNull().default(''),
  icon: text('icon'),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const timelineMilestones = sqliteTable('timeline_milestones', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  eventId: integer('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  date: text('date'),
  note: text('note'),
  sortOrder: integer('sort_order').notNull().default(0),
})

// Per-event notice board, newest first, pinned rows floating to the top.
export const announcements = sqliteTable('announcements', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  eventId: integer('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  body: text('body').notNull().default(''),
  pinned: integer('pinned', { mode: 'boolean' }).notNull().default(false),
  published: integer('published', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

export const sponsors = sqliteTable('sponsors', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  // null = shown on every event (house partners); set = that event only.
  eventId: integer('event_id').references(() => events.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  logoUrl: text('logo_url'),
  websiteUrl: text('website_url'),
  tier: text('tier').notNull().default(''),
  contactPerson: text('contact_person').notNull().default(''),
  contactEmail: text('contact_email').notNull().default(''),
  phone: text('phone').notNull().default(''),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const people = sqliteTable('people', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  title: text('title').notNull().default(''),
  organization: text('organization').notNull().default(''),
  photoUrl: text('photo_url'),
  bio: text('bio').notNull().default(''),
  role: text('role', { enum: ['judge', 'speaker'] }).notNull().default('judge'),
  socialUrl: text('social_url'),
  email: text('email').notNull().default(''),
  phone: text('phone').notNull().default(''),
  expertise: text('expertise').notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const winners = sqliteTable('winners', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  // Which edition they won. Nullable so older rows that only recorded a year
  // keep working; the admin screen filters on it when it is set.
  eventId: integer('event_id').references(() => events.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  competitionName: text('competition_name').notNull().default(''),
  position: text('position').notNull().default(''),
  year: integer('year'),
  photoUrl: text('photo_url'),
  projectTitle: text('project_title'),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const faqs = sqliteTable('faqs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  // Both null = a site-wide question. Set one to scope it to an event or a competition.
  eventId: integer('event_id').references(() => events.id, { onDelete: 'cascade' }),
  competitionId: integer('competition_id').references(() => competitions.id, { onDelete: 'cascade' }),
  question: text('question').notNull(),
  answer: text('answer').notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const newsletterSubscribers = sqliteTable('newsletter_subscribers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})


export const howItWorksSteps = sqliteTable('how_it_works_steps', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  body: text('body').notNull().default(''),
  icon: text('icon'),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const contactMessages = sqliteTable('contact_messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull(),
  subject: text('subject').notNull().default(''),
  message: text('message').notNull(),
  isRead: integer('is_read', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

export const admins = sqliteTable('admins', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  // 'admin' = full panel; 'volunteer' = scan/check-in only (event-day staff).
  role: text('role', { enum: ['admin', 'volunteer'] }).notNull().default('admin'),
})

// ---- Participant accounts + per-person QR check-in ----

export const participantAccounts = sqliteTable('participant_accounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'), // null until the invite is accepted
  fullName: text('full_name').notNull(),
  phone: text('phone'),
  // invited: teammate, no password yet. pending: leader has set a password but
  // has not clicked the email verification link. active: usable for login.
  status: text('status', { enum: ['invited', 'pending', 'active'] }).notNull().default('invited'),
  inviteToken: text('invite_token').unique(),
  inviteExpires: text('invite_expires'),
  emailVerifyToken: text('email_verify_token').unique(),
  emailVerifyExpires: text('email_verify_expires'),
  resetToken: text('reset_token').unique(),
  resetExpires: text('reset_expires'),
  // Opaque value the personal QR encodes; never contains PII.
  checkinToken: text('checkin_token').notNull().unique(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

export const teamMembers = sqliteTable(
  'team_members',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    registrationId: integer('registration_id').notNull().references(() => registrations.id, { onDelete: 'cascade' }),
    // Denormalised from the parent registration purely so the one-team-per-
    // competition rule below can be a real SQL constraint. Always write the
    // registration's own competitionId here.
    competitionId: integer('competition_id').notNull().references(() => competitions.id, { onDelete: 'cascade' }),
    accountId: integer('account_id').notNull().references(() => participantAccounts.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['leader', 'member'] }).notNull().default('member'),
    createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  },
  (t) => [
    uniqueIndex('team_members_registration_account_unique').on(t.registrationId, t.accountId),
    // One account = one team per competition, for leaders and members alike.
    uniqueIndex('team_members_competition_account_unique').on(t.competitionId, t.accountId),
  ],
)

export const checkpoints = sqliteTable('checkpoints', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  eventId: integer('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  // null = applies to the whole event (kit/lunch desks shared by every track);
  // set = only participants of that competition may collect here.
  competitionId: integer('competition_id').references(() => competitions.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  location: text('location').notNull().default(''),
  description: text('description').notNull().default(''),
  icon: text('icon'),
  qrEnabled: integer('qr_enabled', { mode: 'boolean' }).notNull().default(true),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
})

// Which volunteers staff which check-in point.
export const checkpointVolunteers = sqliteTable(
  'checkpoint_volunteers',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    checkpointId: integer('checkpoint_id').notNull().references(() => checkpoints.id, { onDelete: 'cascade' }),
    adminId: integer('admin_id').notNull().references(() => admins.id, { onDelete: 'cascade' }),
  },
  (t) => [uniqueIndex('checkpoint_volunteers_unique').on(t.checkpointId, t.adminId)],
)

// A volunteer works one event and any number of its competitions. The
// single-event rule is enforced in the API; the DB keeps the pairs unique.
export const volunteerAssignments = sqliteTable(
  'volunteer_assignments',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    adminId: integer('admin_id').notNull().references(() => admins.id, { onDelete: 'cascade' }),
    eventId: integer('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
    competitionId: integer('competition_id').notNull().references(() => competitions.id, { onDelete: 'cascade' }),
  },
  (t) => [uniqueIndex('volunteer_assignments_unique').on(t.adminId, t.competitionId)],
)

// Judges (rows in `people`) assigned to the competitions they score.
export const judgeAssignments = sqliteTable(
  'judge_assignments',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    personId: integer('person_id').notNull().references(() => people.id, { onDelete: 'cascade' }),
    competitionId: integer('competition_id').notNull().references(() => competitions.id, { onDelete: 'cascade' }),
  },
  (t) => [uniqueIndex('judge_assignments_unique').on(t.personId, t.competitionId)],
)

// Login credentials for a judge, 1:1 with a `people` row. Kept separate from
// `people` rather than adding passwordHash there directly: people.email is
// shared with non-authenticating speaker rows and isn't unique, so retrofitting
// a login-shaped constraint onto it would be messy. Admin-invited only (no
// self-registration), so there's no "prove you own this inbox before a
// stranger controls it" risk the participant invite flow guards against —
// hence no separate 'pending'/email-verify status, just invited -> active.
export const judgeAccounts = sqliteTable('judge_accounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  personId: integer('person_id').notNull().unique().references(() => people.id, { onDelete: 'cascade' }),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'), // null until invite accepted
  // Denormalised from people.name at invite time, deliberately: the session
  // payload doesn't need a join to render "Hi, {name}", and renaming the
  // people row later doesn't retroactively relabel an already-issued login.
  fullName: text('full_name').notNull(),
  status: text('status', { enum: ['invited', 'active'] }).notNull().default('invited'),
  inviteToken: text('invite_token').unique(),
  inviteExpires: text('invite_expires'),
  resetToken: text('reset_token').unique(),
  resetExpires: text('reset_expires'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

// One row per (team, criterion, judge). Re-scoring the same team/criterion by
// the same judge is an upsert against the unique index below, not a new row —
// that's what makes marks editable without a separate history table.
export const scores = sqliteTable(
  'scores',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    registrationId: integer('registration_id').notNull().references(() => registrations.id, { onDelete: 'cascade' }),
    criterionId: integer('criterion_id').notNull().references(() => judgingCriteria.id, { onDelete: 'cascade' }),
    judgeId: integer('judge_id').notNull().references(() => judgeAccounts.id, { onDelete: 'cascade' }),
    // Denormalised from the registration, same rationale as
    // team_members.competitionId: lets scope checks and the leaderboard query
    // filter on a real column instead of joining through registrations.
    competitionId: integer('competition_id').notNull().references(() => competitions.id, { onDelete: 'cascade' }),
    // Raw 1-10 rating. The weighted contribution (value/10 * criterion.weight)
    // is computed at read time, never stored.
    value: integer('value').notNull(),
    note: text('note'),
    createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
    updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
  },
  (t) => [uniqueIndex('scores_registration_criterion_judge_unique').on(t.registrationId, t.criterionId, t.judgeId)],
)

export const checkins = sqliteTable(
  'checkins',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    accountId: integer('account_id').notNull().references(() => participantAccounts.id, { onDelete: 'cascade' }),
    checkpointId: integer('checkpoint_id').notNull().references(() => checkpoints.id, { onDelete: 'cascade' }),
    // Recorded at scan time so the collection report can attribute a pickup to
    // a competition even for event-wide checkpoints.
    competitionId: integer('competition_id').references(() => competitions.id, { onDelete: 'set null' }),
    scannedBy: integer('scanned_by').references(() => admins.id),
    collectedAt: text('collected_at').notNull().default(sql`(datetime('now'))`),
  },
  // One collection per person per checkpoint — the double-collection guard.
  (t) => [uniqueIndex('checkins_account_checkpoint_unique').on(t.accountId, t.checkpointId)],
)

export const siteSettings = sqliteTable('site_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull().default(''),
})

export type Event = typeof events.$inferSelect
export type Competition = typeof competitions.$inferSelect
export type Prize = typeof prizes.$inferSelect
export type Registration = typeof registrations.$inferSelect
export type NewsItem = typeof news.$inferSelect
export type GalleryImage = typeof galleryImages.$inferSelect
export type HomeFeature = typeof homeFeatures.$inferSelect
export type TimelineMilestone = typeof timelineMilestones.$inferSelect
export type Sponsor = typeof sponsors.$inferSelect
export type Person = typeof people.$inferSelect
export type Winner = typeof winners.$inferSelect
export type Faq = typeof faqs.$inferSelect
export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect
export type HowItWorksStep = typeof howItWorksSteps.$inferSelect
export type ContactMessage = typeof contactMessages.$inferSelect
export type Admin = typeof admins.$inferSelect
export type ParticipantAccount = typeof participantAccounts.$inferSelect
export type TeamMember = typeof teamMembers.$inferSelect
export type Checkpoint = typeof checkpoints.$inferSelect
export type Checkin = typeof checkins.$inferSelect
export type JudgeAccount = typeof judgeAccounts.$inferSelect
export type Score = typeof scores.$inferSelect
