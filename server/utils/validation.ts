import { z } from 'zod'

// Any same-origin absolute path (uploads, or the bundled /gallery-images seed
// art) or an absolute http(s) URL. Protocol-relative "//host" is rejected
// because it escapes the origin while looking like a local path.
const imagePath = z
  .string()
  .max(500)
  .refine(
    (v) => v === '' || (v.startsWith('/') && !v.startsWith('//')) || /^https?:\/\//.test(v),
    'Invalid image URL',
  )

export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')

export const eventSchema = z.object({
  title: z.string().trim().min(1).max(200),
  year: z.number().int().min(2000).max(2100),
  slug: z.string().trim().max(100).optional().default(''),
  description: z.string().max(50_000).default(''),
  startDate: isoDate.nullable().optional(),
  endDate: isoDate.nullable().optional(),
  venue: z.string().trim().max(200).nullable().optional(),
  heroImage: imagePath.nullable().optional(),
  status: z.enum(['upcoming', 'ongoing', 'past']).default('upcoming'),
  featured: z.boolean().default(false),
  theme: z.string().trim().max(200).default(''),
  organizer: z.string().trim().max(200).default('BICTA'),
  contactEmail: z.string().trim().max(200).default(''),
  contactPhone: z.string().trim().max(100).default(''),
  emergencyContact: z.string().trim().max(200).default(''),
  entryFee: z.string().trim().max(100).default(''),
  certificate: z.boolean().default(true),
  language: z.string().trim().max(100).default(''),
  eligibility: z.string().max(5_000).default(''),
  objectives: z.string().max(10_000).default(''),
  audience: z.string().max(5_000).default(''),
  benefits: z.string().max(10_000).default(''),
  venueAddress: z.string().max(1_000).default(''),
  venueDirections: z.string().max(5_000).default(''),
  venueParking: z.string().max(2_000).default(''),
  mapEmbed: z.string().trim().max(2_000).default(''),
  tagline: z.string().trim().max(300).default(''),
  eventType: z.enum(['offline', 'online', 'hybrid']).default('offline'),
  published: z.boolean().default(true),
  countdownMode: z.enum(['start', 'deadline', 'custom', 'off']).default('start'),
  countdownAt: z.string().trim().max(30).nullable().optional(),
  meetingInfo: z.string().max(2_000).default(''),
  // Section visibility/heading overrides, validated as a JSON string of a
  // bounded shape so the admin UI cannot store arbitrary payloads.
  sections: z
    .string()
    .max(4_000)
    .default('')
    .refine((v) => {
      if (!v) return true
      try {
        const parsed = JSON.parse(v)
        return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      } catch {
        return false
      }
    }, 'Invalid section settings'),
  seoDescription: z.string().trim().max(300).default(''),
}).refine((v) => !(v.startDate && v.endDate) || v.endDate >= v.startDate, {
  message: 'End date must be on or after the start date',
  path: ['endDate'],
})

export const eventPrizeSchema = z.object({
  eventId: z.number().int().positive(),
  title: z.string().trim().min(1).max(150),
  amount: z.string().trim().max(100).default(''),
  note: z.string().trim().max(300).default(''),
  highlight: z.boolean().default(false),
  published: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(1000).default(0),
})

const hhmm = z.union([z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM'), z.literal('')])

export const scheduleItemSchema = z.object({
  eventId: z.number().int().positive(),
  competitionId: z.number().int().positive().nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD').nullable().optional(),
  startTime: hhmm.default(''),
  endTime: hhmm.default(''),
  title: z.string().trim().min(1).max(200),
  sessionType: z.string().trim().max(100).default(''),
  venue: z.string().trim().max(200).default(''),
  speaker: z.string().trim().max(200).default(''),
  description: z.string().trim().max(1_000).default(''),
  published: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(1000).default(0),
})

export const judgingCriterionSchema = z.object({
  eventId: z.number().int().positive(),
  competitionId: z.number().int().positive().nullable().optional(),
  name: z.string().trim().min(1).max(150),
  description: z.string().trim().max(1_000).default(''),
  weight: z.number().int().min(0).max(100).default(0),
  icon: z.string().trim().max(64).nullable().optional(),
  published: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(1000).default(0),
})

export const applicationFieldSchema = z.object({
  competitionId: z.number().int().positive(),
  label: z.string().trim().min(1).max(200),
  helpText: z.string().trim().max(500).default(''),
  fieldType: z.enum(['text', 'file']).default('text'),
  required: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(1000).default(0),
})

export const prizeSchema = z.object({
  position: z.string().trim().min(1).max(100),
  amount: z.string().trim().min(1).max(100),
  note: z.string().trim().max(300).nullable().optional(),
})

export const competitionSchema = z.object({
  eventId: z.number().int().positive(),
  name: z.string().trim().min(1).max(200),
  slug: z.string().trim().max(100).optional().default(''),
  type: z.string().trim().max(100).default(''),
  description: z.string().max(50_000).default(''),
  rules: z.string().max(50_000).default(''),
  registrationOpen: z.boolean().default(false),
  registrationDeadline: isoDate.nullable().optional(),
  // Freezes judge score-writes; reading scores/leaderboard is unaffected.
  judgingOpen: z.boolean().default(true),
  teamBased: z.boolean().default(false),
  maxTeamSize: z.number().int().min(1).max(20).default(1),
  coverImage: imagePath.nullable().optional(),
  bannerImage: imagePath.nullable().optional(),
  category: z.string().trim().max(100).default(''),
  difficulty: z.enum(['', 'beginner', 'intermediate', 'advanced']).default(''),
  submissionGuidelines: z.string().max(50_000).default(''),
  evaluationCriteria: z.string().max(50_000).default(''),
  resources: z.string().max(50_000).default(''),
  sortOrder: z.number().int().min(0).max(1000).default(0),
  // Application form settings. The window is optional at both ends; a missing
  // close date falls back to registrationDeadline.
  applicationRequired: z.boolean().default(false),
  applicationOpensAt: isoDate.nullable().optional(),
  applicationClosesAt: isoDate.nullable().optional(),
  // When the competition actually runs. Full ISO timestamps (UTC), unlike the
  // plain dates above — the scanner compares against these to the minute.
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  prizes: z.array(prizeSchema).max(20).default([]),
})

export const newsSchema = z.object({
  title: z.string().trim().min(1).max(200),
  slug: z.string().trim().max(100).optional().default(''),
  excerpt: z.string().trim().max(500).default(''),
  content: z.string().max(100_000).default(''),
  coverImage: imagePath.nullable().optional(),
  status: z.enum(['draft', 'published']).default('draft'),
})

// 20k per value: the About BICTA prose (history, objectives, achievements)
// lives here and outgrew the old 2k cap.
export const settingsSchema = z.record(z.string().max(100), z.string().max(20_000))

export const registrationStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'rejected']),
  // Optional reason shown to the team in the decision email + portal.
  decisionNote: z.string().trim().max(2000).optional().default('').transform((v) => v || null),
})

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(12).max(200),
})

// Public registration form payload — strict, unknown keys stripped by default.
export const registrationSchema = z.object({
  competitionId: z.number().int().positive(),
  fullName: z.string().trim().min(2).max(150),
  email: z.string().trim().toLowerCase().email().max(254),
  // No password here: the leader sets one through the emailed activation
  // link, exactly like a teammate accepting an invite.
  phone: z.string().trim().min(5).max(30).regex(/^[+\d][\d\s-]+$/, 'Invalid phone number'),
  institution: z.string().trim().max(200).default(''),
  teamName: z.string().trim().max(150).nullable().optional(),
  teamMembers: z
    .array(z.object({ name: z.string().trim().min(1).max(150), email: z.string().trim().toLowerCase().email().max(254) }))
    .max(20)
    .nullable()
    .optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
  // Text answers for this competition's custom application fields. File
  // answers arrive as separate multipart parts, never through this array.
  answers: z
    .array(z.object({ fieldId: z.number().int().positive(), value: z.string().trim().max(5000) }))
    .max(50)
    .optional()
    .default([]),
  // Anti-spam: honeypot must stay empty; formToken carries render timestamp.
  website: z.string().max(200).optional().default(''),
  formToken: z.string().max(200).optional().default(''),
})

export const idParam = z.coerce.number().int().positive()

// ---- Participant accounts + check-in ----

export const participantLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(200),
})

export const setPasswordSchema = z.object({
  token: z.string().trim().min(20).max(200),
  password: z.string().min(8).max(200),
})

export const verifyEmailSchema = z.object({
  token: z.string().trim().min(20).max(200),
})

// Leader edit of already-submitted application answers — same "answers" shape
// as registrationSchema, but standalone since none of the other registration
// fields are editable through this endpoint.
export const applicationEditSchema = z.object({
  answers: z
    .array(z.object({ fieldId: z.number().int().positive(), value: z.string().trim().max(5000) }))
    .max(50)
    .optional()
    .default([]),
})

export const reassignLeaderSchema = z.object({
  accountId: z.number().int().positive(),
})

// ---- Judge portal ----

export const judgeInviteSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
})

// setPasswordSchema (above) is reused as-is for /api/judge/set-password —
// identical { token, password } shape.

export const judgeScoreEntrySchema = z.object({
  criterionId: z.number().int().positive(),
  value: z.number().int().min(1).max(10),
  note: z.string().trim().max(1000).nullable().optional(),
})
export const judgeScoreBatchSchema = z.array(judgeScoreEntrySchema).min(1).max(50)

export const forgotSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  website: z.string().max(200).optional().default(''),
  formToken: z.string().max(200).optional().default(''),
})

export const teamMemberAddSchema = z.object({
  name: z.string().trim().min(2).max(150),
  email: z.string().trim().toLowerCase().email().max(254),
})

export const checkpointSchema = z.object({
  // null = an event-wide desk any participant may use.
  competitionId: z.coerce.number().int().positive().nullable().optional(),
  name: z.string().trim().min(1).max(100),
  location: z.string().trim().max(200).default(''),
  description: z.string().trim().max(500).default(''),
  icon: z.string().trim().max(64).nullable().optional(),
  qrEnabled: z.coerce.boolean().default(true),
  active: z.coerce.boolean().default(true),
  sortOrder: z.number().int().min(0).max(1000).default(0),
})

// Adding a volunteer takes a name and an email only — they set their own
// password from the emailed link, so no password is ever typed by an admin.
export const volunteerSchema = z.object({
  name: z.string().trim().min(1).max(150),
  email: z.string().trim().toLowerCase().email().max(254),
})

// Editing an existing staff account: rename, correct the address, or change
// whether they may sign in. 'invited' is not offered — that state is produced
// by creating or re-inviting, not by editing.
export const staffUpdateSchema = z.object({
  name: z.string().trim().min(1).max(150),
  email: z.string().trim().toLowerCase().email().max(254),
  status: z.enum(['active', 'banned']).optional(),
})

// Accepting a staff invite.
export const staffSetPasswordSchema = z.object({
  token: z.string().trim().min(10).max(200),
  password: z.string().min(8).max(200),
})

// Moderators: console accounts that do content work but never reach site
// settings, moderator management or the audit log.
export const moderatorSchema = z.object({
  name: z.string().trim().min(1).max(150),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(200),
})

// Editing an existing moderator. Password is optional: omitted means "leave
// the current one alone", so the same form handles rename and reset.
export const moderatorUpdateSchema = z.object({
  name: z.string().trim().min(1).max(150),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(200).optional().or(z.literal('')),
})

// Keyed on the participation (team_members.id), not the person: a check-in
// belongs to one competition registration, so the account alone would be
// ambiguous for anyone entered in more than one competition.
export const checkinSchema = z.object({
  teamMemberId: z.number().int().positive(),
  checkpointId: z.number().int().positive(),
})

const optUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === '' || /^https?:\/\//.test(v), 'Invalid URL')
  .nullable()
  .optional()

// ---- Home page section schemas ----

export const homeFeatureSchema = z.object({
  title: z.string().trim().min(1).max(150),
  body: z.string().trim().max(1000).default(''),
  icon: z.string().trim().max(16).nullable().optional(),
  sortOrder: z.number().int().min(0).max(1000).default(0),
})

export const timelineSchema = z.object({
  // Which edition the milestone belongs to. Optional so a caller without a
  // picker still lands on the current event; the admin screens always send it.
  eventId: z.coerce.number().int().positive().optional(),
  label: z.string().trim().min(1).max(150),
  date: isoDate.nullable().optional(),
  note: z.string().trim().max(500).nullable().optional(),
  sortOrder: z.number().int().min(0).max(1000).default(0),
})

export const sponsorSchema = z.object({
  // null = shown on every event; set = that event only.
  eventId: z.coerce.number().int().positive().nullable().optional(),
  name: z.string().trim().min(1).max(150),
  logoUrl: imagePath.nullable().optional(),
  websiteUrl: optUrl,
  tier: z.string().trim().max(50).default(''),
  contactPerson: z.string().trim().max(150).default(''),
  contactEmail: z.union([z.string().trim().email().max(254), z.literal('')]).default(''),
  phone: z.string().trim().max(30).default(''),
  active: z.coerce.boolean().default(true),
  sortOrder: z.number().int().min(0).max(1000).default(0),
})

export const personSchema = z.object({
  name: z.string().trim().min(1).max(150),
  title: z.string().trim().max(150).default(''),
  organization: z.string().trim().max(150).default(''),
  photoUrl: imagePath.nullable().optional(),
  bio: z.string().max(5000).default(''),
  role: z.enum(['judge', 'speaker']).default('judge'),
  socialUrl: optUrl,
  email: z.union([z.string().trim().email().max(254), z.literal('')]).default(''),
  phone: z.string().trim().max(30).default(''),
  expertise: z.string().trim().max(300).default(''),
  sortOrder: z.number().int().min(0).max(1000).default(0),
})

// Advisory panel on /about. Categories are a fixed enum rather than free text
// so the public page can group by them without normalising strings.
export const advisorSchema = z.object({
  name: z.string().trim().min(1).max(150),
  designation: z.string().trim().max(150).default(''),
  organization: z.string().trim().max(150).default(''),
  photoUrl: imagePath.nullable().optional(),
  linkedinUrl: optUrl,
  category: z.enum(['university', 'industry', 'core']).default('university'),
  sortOrder: z.number().int().min(0).max(1000).default(0),
})

// Which competitions a judge is assigned to score.
export const judgeAssignmentSchema = z.object({
  competitionIds: z.array(z.coerce.number().int().positive()).max(50).default([]),
})

// Which competitions (and therefore which event) a volunteer works.
export const volunteerAssignmentSchema = z.object({
  competitionIds: z.array(z.coerce.number().int().positive()).max(50).default([]),
})

export const winnerSchema = z.object({
  eventId: z.coerce.number().int().positive().nullable().optional(),
  name: z.string().trim().min(1).max(150),
  competitionName: z.string().trim().max(150).default(''),
  position: z.string().trim().max(100).default(''),
  year: z.number().int().min(2000).max(2100).nullable().optional(),
  photoUrl: imagePath.nullable().optional(),
  projectTitle: z.string().trim().max(200).nullable().optional(),
  sortOrder: z.number().int().min(0).max(1000).default(0),
})

export const faqSchema = z.object({
  // Leave both null for a site-wide question; set one to scope it.
  eventId: z.number().int().positive().nullable().optional(),
  competitionId: z.number().int().positive().nullable().optional(),
  question: z.string().trim().min(1).max(300),
  answer: z.string().max(10_000).default(''),
  sortOrder: z.number().int().min(0).max(1000).default(0),
})

export const announcementSchema = z.object({
  eventId: z.number().int().positive(),
  title: z.string().trim().min(1).max(200),
  body: z.string().max(20_000).default(''),
  pinned: z.boolean().default(false),
  published: z.boolean().default(true),
})

export const howItWorksSchema = z.object({
  title: z.string().trim().min(1).max(150),
  body: z.string().trim().max(1000).default(''),
  icon: z.string().trim().max(64).nullable().optional(),
  sortOrder: z.number().int().min(0).max(1000).default(0),
})

// Public newsletter signup — strict, unknown keys stripped.
export const newsletterSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  website: z.string().max(200).optional().default(''),
  formToken: z.string().max(200).optional().default(''),
})

// Admin broadcast mail. Content is capped well under Resend's payload limit
// and re-sanitized server-side regardless of what the rich text editor sent.
// customEmails is required only when audience is 'custom' — enforced with
// .refine below rather than a discriminated union, since every other field
// is shared across all three audiences.
export const mailerSendSchema = z
  .object({
    subject: z.string().trim().min(3).max(150),
    message: z.string().trim().min(1).max(20_000),
    audience: z.enum(['newsletter', 'participants', 'custom']),
    customEmails: z.array(z.string().trim().toLowerCase().email()).max(500).optional().default([]),
  })
  .refine((v) => v.audience !== 'custom' || v.customEmails.length > 0, {
    message: 'Add at least one recipient',
    path: ['customEmails'],
  })

// Public contact form — third public write endpoint, same anti-spam contract.
export const contactSchema = z.object({
  name: z.string().trim().min(2).max(150),
  email: z.string().trim().toLowerCase().email().max(254),
  subject: z.string().trim().max(200).default(''),
  message: z.string().trim().min(5).max(4000),
  website: z.string().max(200).optional().default(''),
  formToken: z.string().max(200).optional().default(''),
})
