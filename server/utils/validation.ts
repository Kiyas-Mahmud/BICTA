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

export const settingsSchema = z.record(z.string().max(100), z.string().max(2000))

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
  name: z.string().trim().min(1).max(150),
  logoUrl: imagePath.nullable().optional(),
  websiteUrl: optUrl,
  tier: z.string().trim().max(50).default(''),
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
  sortOrder: z.number().int().min(0).max(1000).default(0),
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
  question: z.string().trim().min(1).max(300),
  answer: z.string().max(10_000).default(''),
  sortOrder: z.number().int().min(0).max(1000).default(0),
})

export const testimonialSchema = z.object({
  name: z.string().trim().min(1).max(150),
  role: z.string().trim().max(150).default(''),
  quote: z.string().trim().min(1).max(1000),
  photoUrl: imagePath.nullable().optional(),
  sortOrder: z.number().int().min(0).max(1000).default(0),
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
