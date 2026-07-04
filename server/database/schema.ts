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
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
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
  teamBased: integer('team_based', { mode: 'boolean' }).notNull().default(false),
  maxTeamSize: integer('max_team_size').notNull().default(1),
  coverImage: text('cover_image'),
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

export const sponsors = sqliteTable('sponsors', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  logoUrl: text('logo_url'),
  websiteUrl: text('website_url'),
  tier: text('tier').notNull().default(''),
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
  sortOrder: integer('sort_order').notNull().default(0),
})

export const winners = sqliteTable('winners', {
  id: integer('id').primaryKey({ autoIncrement: true }),
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
  question: text('question').notNull(),
  answer: text('answer').notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const newsletterSubscribers = sqliteTable('newsletter_subscribers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

export const testimonials = sqliteTable('testimonials', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  role: text('role').notNull().default(''),
  quote: text('quote').notNull(),
  photoUrl: text('photo_url'),
  sortOrder: integer('sort_order').notNull().default(0),
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
  status: text('status', { enum: ['invited', 'active'] }).notNull().default('invited'),
  inviteToken: text('invite_token').unique(),
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
    accountId: integer('account_id').notNull().references(() => participantAccounts.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['leader', 'member'] }).notNull().default('member'),
    createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  },
  (t) => [uniqueIndex('team_members_registration_account_unique').on(t.registrationId, t.accountId)],
)

export const checkpoints = sqliteTable('checkpoints', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  eventId: integer('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  icon: text('icon'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const checkins = sqliteTable(
  'checkins',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    accountId: integer('account_id').notNull().references(() => participantAccounts.id, { onDelete: 'cascade' }),
    checkpointId: integer('checkpoint_id').notNull().references(() => checkpoints.id, { onDelete: 'cascade' }),
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
export type Testimonial = typeof testimonials.$inferSelect
export type HowItWorksStep = typeof howItWorksSteps.$inferSelect
export type ContactMessage = typeof contactMessages.$inferSelect
export type Admin = typeof admins.$inferSelect
export type ParticipantAccount = typeof participantAccounts.$inferSelect
export type TeamMember = typeof teamMembers.$inferSelect
export type Checkpoint = typeof checkpoints.$inferSelect
export type Checkin = typeof checkins.$inferSelect
