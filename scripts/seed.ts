import bcrypt from 'bcryptjs'
import { useDb, schema } from '../server/database/client'

const WEAK_PASSWORDS = new Set(['admin', 'password', 'change-me-min-12-chars', 'changeme'])

async function main() {
  const name = process.env.ADMIN_NAME ?? 'Admin'
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.ADMIN_PASSWORD

  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env')
  }
  if (password.length < 12 || WEAK_PASSWORDS.has(password)) {
    throw new Error('ADMIN_PASSWORD must be at least 12 characters and not a default value')
  }
  if (process.env.NODE_ENV === 'production' && email.endsWith('@example.com')) {
    throw new Error('Refusing to seed example.com admin email in production')
  }

  const db = useDb()

  // Admin (upsert by email)
  const passwordHash = await bcrypt.hash(password, 12)
  await db
    .insert(schema.admins)
    .values({ name, email, passwordHash })
    .onConflictDoUpdate({ target: schema.admins.email, set: { name, passwordHash } })
  console.log(`Admin ready: ${email}`)

  if (process.env.NODE_ENV === 'production') {
    console.log('Production mode: skipping sample data.')
    return
  }

  // Sample data (dev only, idempotent via slug checks)
  const existing = await db.select({ id: schema.events.id }).from(schema.events).limit(1)
  if (existing.length > 0) {
    console.log('Events already exist: skipping sample data.')
    return
  }

  const [current] = await db
    .insert(schema.events)
    .values({
      title: 'BICTA 2026',
      year: 2026,
      slug: 'bicta-2026',
      description:
        '<p>The biggest edition of BICTA yet — three tracks, bigger prize pool, and a national stage for innovators.</p>',
      startDate: '2026-09-10',
      endDate: '2026-09-12',
      venue: 'Dhaka, Bangladesh',
      status: 'upcoming',
      isCurrent: true,
    })
    .returning()

  const [past] = await db
    .insert(schema.events)
    .values({
      title: 'BICTA 2025',
      year: 2025,
      slug: 'bicta-2025',
      description: '<p>Our 2025 edition brought together 400+ participants across two tracks.</p>',
      startDate: '2025-09-11',
      endDate: '2025-09-13',
      venue: 'Dhaka, Bangladesh',
      status: 'past',
      isCurrent: false,
    })
    .returning()

  const competitionRows = await db
    .insert(schema.competitions)
    .values([
      {
        eventId: current!.id,
        name: 'Project Showcase',
        slug: 'project-showcase-2026',
        type: 'Showcase',
        description: '<p>Present your finished project to a judging panel of industry experts.</p>',
        rules: '<ul><li>Open to teams of 1–4.</li><li>Project must be original work.</li></ul>',
        registrationOpen: true,
        registrationDeadline: '2026-08-31',
        teamBased: true,
        maxTeamSize: 4,
        sortOrder: 1,
      },
      {
        eventId: current!.id,
        name: 'Datathon',
        slug: 'datathon-2026',
        type: 'Data Science',
        description: '<p>48 hours. One dataset. Build the best model and tell the best story.</p>',
        rules: '<ul><li>Teams of up to 3.</li><li>External data allowed if public.</li></ul>',
        registrationOpen: true,
        registrationDeadline: '2026-08-25',
        teamBased: true,
        maxTeamSize: 3,
        sortOrder: 2,
      },
      {
        eventId: current!.id,
        name: 'Hackathon',
        slug: 'hackathon-2026',
        type: 'Hackathon',
        description: '<p>Build a working prototype around this year’s theme in 36 hours.</p>',
        rules: '<ul><li>Teams of up to 5.</li><li>Code must be written during the event.</li></ul>',
        registrationOpen: false,
        teamBased: true,
        maxTeamSize: 5,
        sortOrder: 3,
      },
    ])
    .returning()

  const prizeRows = competitionRows.flatMap((c, i) => [
    { competitionId: c.id, position: 'Champion', amount: `${100 - i * 20}000 BDT`, sortOrder: 1 },
    { competitionId: c.id, position: '1st Runner-up', amount: `${60 - i * 10}000 BDT`, sortOrder: 2 },
    { competitionId: c.id, position: '2nd Runner-up', amount: `${30 - i * 5}000 BDT`, sortOrder: 3 },
  ])
  await db.insert(schema.prizes).values(prizeRows)

  await db.insert(schema.news).values([
    {
      title: 'BICTA 2026 announced — registration now open',
      slug: 'bicta-2026-announced',
      excerpt: 'Three tracks, a bigger prize pool, and a new venue. Here is everything you need to know.',
      content: '<p>We are thrilled to announce BICTA 2026, taking place September 10–12 in Dhaka.</p>',
      status: 'published',
      publishedAt: new Date().toISOString(),
    },
    {
      title: 'Judges panel reveal (draft)',
      slug: 'judges-panel-reveal',
      excerpt: 'Meet the experts scoring this year’s competitions.',
      content: '<p>Draft article — judge bios coming soon.</p>',
      status: 'draft',
    },
  ])

  await db.insert(schema.homeFeatures).values([
    { title: 'National stage', body: 'Compete against the best builders in the country and get noticed by industry leaders.', icon: 'trophy', sortOrder: 1 },
    { title: 'Real prize money', body: 'A prize pool worth lakhs of taka across every competition track.', icon: 'banknote', sortOrder: 2 },
    { title: 'Mentorship', body: 'Learn directly from judges and speakers who have built and scaled real products.', icon: 'compass', sortOrder: 3 },
    { title: 'Career launchpad', body: 'Top performers get internship and hiring conversations with our partners.', icon: 'rocket', sortOrder: 4 },
  ])

  await db.insert(schema.timelineMilestones).values([
    { eventId: current!.id, label: 'Registration opens', date: '2026-07-01', note: 'Sign up for any track.', sortOrder: 1 },
    { eventId: current!.id, label: 'Registration deadline', date: '2026-08-31', note: 'Last day to register.', sortOrder: 2 },
    { eventId: current!.id, label: 'Opening ceremony', date: '2026-09-10', note: 'Kickoff in Dhaka.', sortOrder: 3 },
    { eventId: current!.id, label: 'Finals & awards', date: '2026-09-12', note: 'Winners announced.', sortOrder: 4 },
  ])

  await db.insert(schema.sponsors).values([
    { name: 'TechCorp', tier: 'Platinum', websiteUrl: 'https://example.com', sortOrder: 1 },
    { name: 'DataWorks', tier: 'Gold', websiteUrl: 'https://example.com', sortOrder: 2 },
    { name: 'CloudBD', tier: 'Gold', websiteUrl: 'https://example.com', sortOrder: 3 },
    { name: 'StartupHub', tier: 'Partner', websiteUrl: 'https://example.com', sortOrder: 4 },
  ])

  await db.insert(schema.people).values([
    { name: 'Dr. Ayesha Rahman', title: 'Head of AI', organization: 'TechCorp', bio: 'Leads applied ML research and has judged national hackathons for a decade.', role: 'judge', sortOrder: 1 },
    { name: 'Tanvir Hasan', title: 'Founder & CEO', organization: 'DataWorks', bio: 'Built and scaled one of the country’s largest data platforms.', role: 'judge', sortOrder: 2 },
    { name: 'Nadia Islam', title: 'Principal Engineer', organization: 'CloudBD', bio: 'Speaks on distributed systems and developer experience.', role: 'speaker', sortOrder: 3 },
  ])

  await db.insert(schema.winners).values([
    { name: 'Team Quantum', competitionName: 'Datathon', position: 'Champion', year: 2025, projectTitle: 'Flood prediction model', sortOrder: 1 },
    { name: 'Team Nexus', competitionName: 'Hackathon', position: 'Champion', year: 2025, projectTitle: 'Rural telemedicine app', sortOrder: 2 },
    { name: 'Team Vertex', competitionName: 'Project Showcase', position: 'Champion', year: 2025, projectTitle: 'Smart agriculture sensors', sortOrder: 3 },
  ])

  await db.insert(schema.faqs).values([
    { question: 'Who can participate?', answer: '<p>Any student or early-career builder in Bangladesh. Some tracks are team-based, some are solo.</p>', sortOrder: 1 },
    { question: 'Is there a registration fee?', answer: '<p>No. Registration is completely free for all competitions.</p>', sortOrder: 2 },
    { question: 'Can I join more than one competition?', answer: '<p>Yes, as long as the schedules do not clash. Register for each separately.</p>', sortOrder: 3 },
    { question: 'How are winners selected?', answer: '<p>A panel of industry judges scores each submission against published criteria.</p>', sortOrder: 4 },
  ])

  // Gallery photos for the current event (files shipped in public/gallery-images).
  await db.insert(schema.galleryImages).values(
    [
      '/gallery-images/hackathons.jpg',
      '/gallery-images/images (1).jpg',
      '/gallery-images/images (2).jpg',
      '/gallery-images/images (3).jpg',
      '/gallery-images/images (4).jpg',
      '/gallery-images/images.jpg',
      '/gallery-images/photo-1624996752380-8ec242e0f85d.avif',
      '/gallery-images/photo-1688733720228-4f7a18681c4f.avif',
    ].map((url, i) => ({ eventId: current!.id, url, sortOrder: i + 1 })),
  )

  await db.insert(schema.testimonials).values([
    { name: 'Rafid Karim', role: 'Team Quantum, Datathon Champion 2025', quote: 'BICTA was the first stage where our work got seen by real industry leaders. We walked out with a trophy and two internship offers.', sortOrder: 1 },
    { name: 'Sadia Noor', role: 'Hackathon Finalist 2025', quote: 'The mentorship during the 36-hour build changed how I think about shipping products. Best weekend of my year.', sortOrder: 2 },
    { name: 'Tanjim Hasan', role: 'Project Showcase, 1st Runner-up 2025', quote: 'Professional judging, clear criteria, zero chaos. BICTA treats student builders like professionals.', sortOrder: 3 },
  ])

  await db.insert(schema.howItWorksSteps).values([
    { title: 'Pick your track', body: 'Browse the competitions and choose the arena that fits your skills.', icon: 'list-checks', sortOrder: 1 },
    { title: 'Register your team', body: 'Fill in the two-minute form, solo or with teammates.', icon: 'user-plus', sortOrder: 2 },
    { title: 'Build and submit', body: 'Work on your project and submit before the deadline.', icon: 'rocket', sortOrder: 3 },
    { title: 'Get judged and win', body: 'Present to the panel. Winners take prizes and recognition.', icon: 'trophy', sortOrder: 4 },
  ])

  await db.insert(schema.siteSettings).values([
    { key: 'hero_eyebrow', value: 'National ICT Programming Festival' },
    { key: 'hero_tagline', value: 'Innovate. Code. Compete. Inspire.' },
    { key: 'hero_blurb', value: 'The biggest national ICT programming festival with three tracks, a bigger prize pool, and a national stage for innovators.' },
    { key: 'stat_participants', value: '2,340+' },
    { key: 'stat_teams', value: '420+' },
    { key: 'stat_universities', value: '65+' },
    { key: 'contact_email', value: 'hello@bicta.example' },
    { key: 'facebook_url', value: 'https://facebook.com' },
    { key: 'linkedin_url', value: 'https://linkedin.com' },
    { key: 'footer_text', value: 'The national ICT programming festival. Innovate. Code. Compete.' },
    // Section headings
    { key: 'why_heading', value: 'Why join BICTA' },
    { key: 'why_subtext', value: 'More than a competition. A launchpad.' },
    { key: 'timeline_heading', value: 'Important dates' },
    { key: 'sponsors_heading', value: 'Sponsors & partners' },
    { key: 'people_heading', value: 'Judges & speakers' },
    { key: 'gallery_heading', value: 'Media gallery' },
    { key: 'winners_heading', value: 'Previous winners' },
    { key: 'faq_heading', value: 'Frequently asked questions' },
    { key: 'venue_heading', value: 'Venue & location' },
    { key: 'newsletter_heading', value: 'Stay in the loop' },
    { key: 'newsletter_subtext', value: 'Get announcements and deadlines in your inbox.' },
    // Venue
    { key: 'venue_name', value: 'Bangabandhu International Conference Center' },
    { key: 'venue_address', value: 'Agargaon, Dhaka 1207, Bangladesh' },
    { key: 'venue_directions', value: 'Near the National Parliament, accessible by metro and bus.' },
    { key: 'venue_map_embed', value: 'https://www.google.com/maps?q=Bangabandhu+International+Conference+Center&output=embed' },
  ])

  console.log(
    `Sample data: 2 events, ${competitionRows.length} competitions, ${prizeRows.length} prizes, 2 news, 4 features, 4 milestones, 4 sponsors, 3 people, 3 winners, 4 faqs, settings. Past event id: ${past!.id}`,
  )
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err.message ?? err)
    process.exit(1)
  })
