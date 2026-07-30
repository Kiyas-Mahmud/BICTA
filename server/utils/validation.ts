import { z } from 'zod'

const imagePath = z
  .string()
  .max(500)
  .refine((v) => v === '' || v.startsWith('/uploads/') || /^https?:\/\//.test(v), 'Invalid image URL')

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')

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
  // Leader's portal password, set at registration time (min 8 chars).
  // Optional only because a signed-in participant entering an additional
  // competition already has one; the handler requires it when there is no
  // participant session.
  password: z.string().min(8).max(200).optional(),
  phone: z.string().trim().min(5).max(30).regex(/^[+\d][\d\s-]+$/, 'Invalid phone number'),
  institution: z.string().trim().max(200).default(''),
  teamName: z.string().trim().max(150).nullable().optional(),
  teamMembers: z
    .array(z.object({ name: z.string().trim().min(1).max(150), email: z.string().trim().toLowerCase().email().max(254) }))
    .max(20)
    .nullable()
    .optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
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

export const volunteerSchema = z.object({
  name: z.string().trim().min(1).max(150),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(200),
})

export const checkinSchema = z.object({
  accountId: z.number().int().positive(),
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

// Which competitions a judge is assigned to score.
export const judgeAssignmentSchema = z.object({
  competitionIds: z.array(z.coerce.number().int().positive()).max(50).default([]),
})

// Which competitions (and therefore which event) a volunteer works.
export const volunteerAssignmentSchema = z.object({
  competitionIds: z.array(z.coerce.number().int().positive()).max(50).default([]),
})

export const winnerSchema = z.object({
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

// Public contact form — third public write endpoint, same anti-spam contract.
export const contactSchema = z.object({
  name: z.string().trim().min(2).max(150),
  email: z.string().trim().toLowerCase().email().max(254),
  subject: z.string().trim().max(200).default(''),
  message: z.string().trim().min(5).max(4000),
  website: z.string().max(200).optional().default(''),
  formToken: z.string().max(200).optional().default(''),
})
