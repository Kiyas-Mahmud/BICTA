<script setup lang="ts">
import type { TimelineItem } from '~/components/site/Timeline.vue'

const route = useRoute()
const eventKey = route.params.id as string

// Both fetches are awaited up front. An await later in setup would strand every
// lifecycle hook registered after it: Vue loses the active instance across the
// async boundary, so those hooks silently never run.
const { data: ev } = await useFetch(`/api/public/events/${encodeURIComponent(eventKey)}`, { key: `event-${eventKey}` })
// Same key the default layout uses, so this shares one request.
const { data: siteSettings } = await useFetch('/api/public/settings', { key: 'site-settings' })
if (!ev.value) {
  throw createError({ statusCode: 404, statusMessage: 'Event not found', fatal: true })
}

// Canonical URL is the slug. Legacy numeric links redirect permanently, but
// only during SSR: awaiting navigateTo inside setup on the client suspends the
// component and leaves the page blank until a manual refresh.
if (import.meta.server && /^\d+$/.test(eventKey) && ev.value.slug) {
  await navigateTo(`/events/${ev.value.slug}`, { redirectCode: 301 })
}

// ---- Per-event section settings ({"prizes":{"visible":false,"heading":"…"}}) ----
const sectionCfg = computed<Record<string, { visible?: boolean; heading?: string }>>(() => {
  try {
    return ev.value!.sections ? JSON.parse(ev.value!.sections) : {}
  } catch {
    return {}
  }
})
function secVisible(name: string) {
  return sectionCfg.value[name]?.visible !== false
}
function secHeading(name: string, fallback: string) {
  return sectionCfg.value[name]?.heading || fallback
}

// ---- Registration + lifecycle state ----
const now = useState('event-now', () => Date.now())
onMounted(() => {
  const t = setInterval(() => (now.value = Date.now()), 30_000)
  onBeforeUnmount(() => clearInterval(t))
})

const openComps = computed(() => ev.value!.competitions.filter((c) => c.registrationOpen))
const firstOpen = computed(() => openComps.value[0])

// Earliest open deadline stands in for the event-level registration deadline.
const regDeadline = computed(() => {
  const ds = openComps.value.map((c) => c.registrationDeadline).filter(Boolean).sort()
  return ds[0] ?? null
})

const lifecycle = computed(() => {
  const e = ev.value!
  const start = e.startDate ? new Date(`${e.startDate}T00:00:00Z`).getTime() : null
  const end = e.endDate ? new Date(`${e.endDate}T23:59:59Z`).getTime() : null
  if (e.status === 'past' || (end && now.value > end)) return { label: 'Event Completed', class: 'badge badge-gray', dot: false }
  if (e.status === 'ongoing' || (start && end && now.value >= start && now.value <= end))
    return { label: 'Event Ongoing', class: 'pill-open', dot: true }
  if (openComps.value.length) {
    const d = regDeadline.value ? Math.ceil((new Date(`${regDeadline.value}T23:59:59Z`).getTime() - now.value) / 86_400_000) : null
    if (d !== null && d >= 0 && d <= 7) return { label: 'Registration Closing Soon', class: 'badge badge-orange', dot: false }
    return { label: 'Registration Open', class: 'pill-open', dot: true }
  }
  return { label: 'Registration Closed', class: 'badge badge-gray', dot: false }
})

// ---- Countdown (admin-configured target) ----
const countdownTarget = computed(() => {
  const e = ev.value!
  if (e.countdownMode === 'off') return null
  if (e.countdownMode === 'custom') return e.countdownAt || null
  if (e.countdownMode === 'deadline') return regDeadline.value ? `${regDeadline.value}T23:59:59Z` : null
  return e.startDate ? `${e.startDate}T00:00:00Z` : null
})
const countdownState = computed(() => {
  if (!countdownTarget.value) return 'hidden'
  const target = new Date(countdownTarget.value).getTime()
  if (Number.isNaN(target)) return 'hidden'
  if (now.value < target) return 'counting'
  const e = ev.value!
  const end = e.endDate ? new Date(`${e.endDate}T23:59:59Z`).getTime() : null
  if (end && now.value > end) return 'done'
  return e.countdownMode === 'start' ? 'live' : 'done'
})

const eventTypeLabel = computed(
  () => ({ offline: 'In person', online: 'Online', hybrid: 'Hybrid' })[ev.value!.eventType] ?? 'In person',
)

// ---- Section registry: drives both the page and the sticky nav ----
const objectiveList = computed(() => (ev.value!.objectives ?? '').split('\n').map((l: string) => l.trim()).filter(Boolean))
const benefitList = computed(() => (ev.value!.benefits ?? '').split('\n').map((l: string) => l.trim()).filter(Boolean))
const galleryImages = computed(() => (ev.value!.gallery ?? []).map((g: any) => g.url))

// Venue. The fallback to the site-wide venue is all-or-nothing: mixing an
// event's own address with the default map would point the pin at the wrong
// place. When the event has an address but no embed, the map is derived from
// that address so the pin always matches the text beside it.
const venue = computed(() => {
  const s = (siteSettings.value ?? {}) as Record<string, string>
  const e = ev.value!
  const ownVenue = e.venue || e.venueAddress || e.mapEmbed

  if (!ownVenue) {
    return {
      name: s.venue_name ?? '',
      address: s.venue_address ?? '',
      directions: s.venue_directions ?? '',
      mapEmbed: s.venue_map_embed ?? '',
    }
  }

  const query = e.venueAddress || e.venue || ''
  return {
    name: e.venue ?? '',
    address: e.venueAddress,
    directions: e.venueDirections,
    mapEmbed: e.mapEmbed || (query ? `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed` : ''),
  }
})
const hasVenue = computed(() =>
  ev.value!.eventType === 'online'
    ? Boolean(ev.value!.meetingInfo)
    : Boolean(venue.value.name || venue.value.address || venue.value.mapEmbed),
)
// Parking / online-joining / phone cards sit beside the map; with none of them
// the map takes the full width instead of leaving a gap.
const venueAsides = computed(() =>
  [
    ev.value!.eventType === 'hybrid' && ev.value!.meetingInfo,
    ev.value!.venueParking,
    ev.value!.contactPhone,
  ].filter(Boolean).length,
)
const totalPrizePool = computed(() => {
  // Free-text amounts: only summable when every published amount is numeric.
  const nums = ev.value!.eventPrizes.map((p: any) => Number(String(p.amount).replace(/[^0-9.]/g, '')))
  if (!nums.length || nums.some((n: number) => !Number.isFinite(n) || n === 0)) return ''
  return nums.reduce((a: number, b: number) => a + b, 0).toLocaleString('en-US')
})

const timelineItems = computed<TimelineItem[]>(() => {
  const rows = ev.value!.timeline ?? []
  const today = new Date().toISOString().slice(0, 10)
  const firstUpcoming = rows.findIndex((r: any) => (r.date ?? '') >= today)
  return rows.map((r: any, i: number) => ({
    id: String(r.id),
    title: r.label,
    description: r.note ?? '',
    timestamp: r.date ?? '',
    status: firstUpcoming === -1 || i < firstUpcoming ? 'completed' : i === firstUpcoming ? 'active' : 'pending',
  }))
})

// Schedule grouped by date, with day + segment filters.
const scheduleDay = ref('')
const scheduleComp = ref<number | ''>('')
const scheduleDays = computed(() => [...new Set(ev.value!.schedule.map((s: any) => s.date ?? ''))])
const filteredSchedule = computed(() =>
  ev.value!.schedule.filter(
    (s: any) =>
      (!scheduleDay.value || (s.date ?? '') === scheduleDay.value) &&
      (scheduleComp.value === '' || s.competitionId === scheduleComp.value || s.competitionId === null),
  ),
)
const scheduleByDay = computed(() => {
  const groups = new Map<string, any[]>()
  for (const s of filteredSchedule.value) {
    const k = s.date ?? ''
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k)!.push(s)
  }
  return [...groups.entries()].map(([date, items]) => ({ date, items }))
})
function compName(id: number | null) {
  return ev.value!.competitions.find((c: any) => c.id === id)?.name ?? ''
}

const sections = computed(() => {
  const e = ev.value!
  const list = [
    { id: 'about', label: 'About', show: secVisible('about') && Boolean(e.description || objectiveList.value.length || benefitList.value.length) },
    { id: 'prizes', label: 'Prize Pool', show: secVisible('prizes') && e.eventPrizes.length > 0 },
    { id: 'timeline', label: 'Timeline', show: secVisible('timeline') && timelineItems.value.length > 0 },
    { id: 'competitions', label: 'Competitions', show: secVisible('competitions') && e.competitions.length > 0 },
    { id: 'schedule', label: 'Schedule', show: secVisible('schedule') && e.schedule.length > 0 },
    { id: 'criteria', label: 'Judging', show: secVisible('criteria') && e.criteria.length > 0 },
    { id: 'people', label: 'Judges', show: secVisible('people') && e.judges.length > 0 },
    { id: 'sponsors', label: 'Sponsors', show: secVisible('sponsors') && e.sponsors.length > 0 },
    { id: 'venue', label: 'Venue', show: secVisible('venue') && hasVenue.value },
    { id: 'gallery', label: 'Gallery', show: secVisible('gallery') && galleryImages.value.length > 0 },
    { id: 'faq', label: 'FAQ', show: secVisible('faq') && e.faqs.length > 0 },
  ]
  return list.filter((s) => s.show)
})

// Active-section highlight in the sticky nav.
const activeSection = ref('')
onMounted(() => {
  if (!('IntersectionObserver' in window)) return
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) if (entry.isIntersecting) activeSection.value = entry.target.id
    },
    { rootMargin: '-25% 0px -65% 0px' },
  )
  for (const s of sections.value) {
    const el = document.getElementById(s.id)
    if (el) observer.observe(el)
  }
  onBeforeUnmount(() => observer.disconnect())
})

const criteriaTotal = computed(() => ev.value!.criteria.reduce((a: number, c: any) => a + c.weight, 0))

useSeoMeta({
  title: () => ev.value!.title,
  description: () => ev.value!.seoDescription || ev.value!.tagline || ev.value!.theme || undefined,
  ogTitle: () => ev.value!.title,
  ogDescription: () => ev.value!.seoDescription || ev.value!.tagline || undefined,
  ogImage: () => ev.value!.heroImage || undefined,
})
</script>

<template>
  <div v-if="ev">
    <!-- 1. HERO — full viewport, cover image behind, content centred -->
    <section class="relative flex min-h-[100svh] flex-col overflow-hidden">
      <div class="absolute inset-0 z-0">
        <img
          v-if="ev.heroImage"
          :src="ev.heroImage"
          :alt="ev.title"
          class="h-full w-full object-cover"
          fetchpriority="high"
        />
        <!-- Layered scrim: keeps every text size readable over any photo. -->
        <div
          class="absolute inset-0"
          :class="ev.heroImage ? 'bg-ink/65' : 'bg-gradient-to-br from-brand-800 to-brand-600'"
        />
        <div v-if="ev.heroImage" class="absolute inset-0 bg-gradient-to-t from-ink via-ink/35 to-ink/55" />
      </div>

      <div class="container-site relative z-10 pt-24">
        <SiteBackButton to="/events" label="All events" class="!border-white/20 !bg-transparent !text-white/70 hover:!text-white" />
      </div>

      <div class="container-site relative z-10 flex flex-1 items-center justify-center py-10">
        <div class="mx-auto max-w-3xl text-center">
          <div class="rise rise-1 flex flex-wrap items-center justify-center gap-2">
            <span :class="lifecycle.class"><span v-if="lifecycle.dot" class="dot-live" />{{ lifecycle.label }}</span>
            <span class="badge badge-blue">{{ eventTypeLabel }}</span>
            <span class="text-sm font-semibold text-white/70">{{ ev.organizer || 'BICTA' }} · {{ ev.year }}</span>
          </div>

          <h1 class="rise rise-2 mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
            {{ ev.title }}
          </h1>
          <p v-if="ev.tagline || ev.theme" class="rise rise-2 mx-auto mt-4 max-w-2xl text-lg font-bold text-white/90 sm:text-xl">
            {{ ev.tagline || ev.theme }}
          </p>
          <p v-if="ev.seoDescription" class="rise rise-3 mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">
            {{ ev.seoDescription }}
          </p>

          <p class="rise rise-3 mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm font-semibold text-white/75">
            <span v-if="formatDateRange(ev.startDate, ev.endDate)" class="inline-flex items-center gap-1.5">
              <Icon name="lucide:calendar" /> {{ formatDateRange(ev.startDate, ev.endDate) }}
            </span>
            <span v-if="regDeadline" class="inline-flex items-center gap-1.5">
              <Icon name="lucide:clock" /> Register by {{ formatDate(regDeadline) }}
            </span>
            <span v-if="ev.venue" class="inline-flex items-center gap-1.5"><Icon name="lucide:map-pin" /> {{ ev.venue }}</span>
          </p>

          <!-- live proof: participants + teams, straight from the database -->
          <p v-if="(ev.stats?.participants ?? 0) || (ev.stats?.teams ?? 0)" class="rise rise-3 mt-2.5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm font-semibold text-white/75">
            <span v-if="(ev.stats?.participants ?? 0)" class="inline-flex items-center gap-1.5">
              <Icon name="lucide:users" /> {{ (ev.stats?.participants ?? 0) }} participants
            </span>
            <span v-if="(ev.stats?.teams ?? 0)" class="inline-flex items-center gap-1.5">
              <Icon name="lucide:users-round" /> {{ (ev.stats?.teams ?? 0) }} teams registered
            </span>
          </p>

          <div v-if="countdownState !== 'hidden'" class="rise rise-4 mt-9">
            <template v-if="countdownState === 'counting'">
              <p class="mb-3 text-[0.7rem] font-bold uppercase tracking-[0.16em] text-white/60">
                {{ ev.countdownMode === 'deadline' ? 'Registration closes in' : 'Event starts in' }}
              </p>
              <UiAnimatedNumberCountdown :end-date="countdownTarget!" class="text-white" />
            </template>
            <p v-else-if="countdownState === 'live'" class="pill-open !text-sm"><span class="dot-live" /> Event is Live</p>
            <p v-else class="badge badge-gray !text-sm">Event Completed</p>
          </div>

          <div class="rise rise-4 mt-8 flex flex-col items-stretch gap-2.5 sm:flex-row sm:items-center sm:justify-center">
            <NuxtLink
              v-if="firstOpen"
              :to="`/events/${ev.slug}/${firstOpen.slug}/register`"
              class="btn-primary w-full justify-center sm:w-auto"
            >
              Register Now <Icon name="lucide:arrow-right" />
            </NuxtLink>
            <a href="#competitions" class="btn-secondary w-full justify-center sm:w-auto">Explore Competitions</a>
          </div>
        </div>
      </div>

      <!-- scroll affordance: the fold is a full screen tall now -->
      <div class="relative z-10 flex justify-center pb-8" aria-hidden="true">
        <a href="#competitions" class="rounded-full p-2 text-white/50 transition hover:text-white">
          <Icon name="lucide:chevron-down" class="text-2xl" />
        </a>
      </div>
    </section>

    <!-- 2. STICKY EVENT NAV -->
    <nav v-if="sections.length > 1" class="sticky top-16 z-30 border-b border-line bg-white/95 sm:top-[4.25rem]" aria-label="Event sections">
      <div class="container-site flex items-center gap-1 overflow-x-auto py-2">
        <a
          v-for="s in sections"
          :key="s.id"
          :href="`#${s.id}`"
          class="whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-bold transition"
          :class="activeSection === s.id ? 'bg-brand-50 text-brand-700' : 'text-ink-soft hover:bg-mist-1 hover:text-brand-700'"
        >
          {{ s.label }}
        </a>
        <NuxtLink
          v-if="firstOpen"
          :to="`/events/${ev.slug}/${firstOpen.slug}/register`"
          class="btn-primary ml-auto shrink-0 !px-3.5 !py-1.5 !text-xs"
        >
          Register
        </NuxtLink>
      </div>
    </nav>

    <!-- 3. QUICK INFORMATION -->
    <section v-if="secVisible('quick')" class="container-site pt-8">
      <dl class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div v-if="formatDateRange(ev.startDate, ev.endDate)" class="card flex items-start gap-3 p-4">
          <span class="tile tile-blue shrink-0"><Icon name="lucide:calendar" /></span>
          <div class="min-w-0">
            <dt class="text-xs font-bold uppercase tracking-wide text-ink-faint">Dates</dt>
            <dd class="mt-0.5 text-sm font-semibold leading-snug text-ink">{{ formatDateRange(ev.startDate, ev.endDate) }}</dd>
          </div>
        </div>
        <div v-if="regDeadline" class="card flex items-start gap-3 p-4">
          <span class="tile tile-orange shrink-0"><Icon name="lucide:clock" /></span>
          <div class="min-w-0">
            <dt class="text-xs font-bold uppercase tracking-wide text-ink-faint">Register by</dt>
            <dd class="mt-0.5 text-sm font-semibold leading-snug text-ink">{{ formatDate(regDeadline) }}</dd>
          </div>
        </div>
        <div v-if="ev.venue || ev.eventType === 'online'" class="card flex items-start gap-3 p-4">
          <span class="tile tile-green shrink-0"><Icon name="lucide:map-pin" /></span>
          <div class="min-w-0">
            <dt class="text-xs font-bold uppercase tracking-wide text-ink-faint">{{ ev.eventType === 'online' ? 'Format' : 'Venue' }}</dt>
            <dd class="mt-0.5 truncate text-sm font-semibold leading-snug text-ink">{{ ev.eventType === 'online' ? 'Online' : ev.venue }}</dd>
          </div>
        </div>
        <div class="card flex items-start gap-3 p-4">
          <span class="tile tile-purple shrink-0"><Icon name="lucide:trophy" /></span>
          <div class="min-w-0">
            <dt class="text-xs font-bold uppercase tracking-wide text-ink-faint">Segments</dt>
            <dd class="mt-0.5 text-sm font-semibold leading-snug text-ink">{{ ev.competitions.length }} competitions</dd>
          </div>
        </div>
        <div v-if="ev.entryFee" class="card flex items-start gap-3 p-4">
          <span class="tile tile-cyan shrink-0"><Icon name="lucide:banknote" /></span>
          <div class="min-w-0">
            <dt class="text-xs font-bold uppercase tracking-wide text-ink-faint">Entry fee</dt>
            <dd class="mt-0.5 text-sm font-semibold leading-snug text-ink">{{ ev.entryFee }}</dd>
          </div>
        </div>
        <div v-if="ev.eligibility" class="card flex items-start gap-3 p-4 sm:col-span-2">
          <span class="tile tile-pink shrink-0"><Icon name="lucide:user-check" /></span>
          <div class="min-w-0">
            <dt class="text-xs font-bold uppercase tracking-wide text-ink-faint">Eligibility</dt>
            <dd class="mt-0.5 text-sm font-semibold leading-snug text-ink">{{ ev.eligibility }}</dd>
          </div>
        </div>
        <div v-if="totalPrizePool" class="card flex items-start gap-3 p-4">
          <span class="tile tile-orange shrink-0"><Icon name="lucide:award" /></span>
          <div class="min-w-0">
            <dt class="text-xs font-bold uppercase tracking-wide text-ink-faint">Prize pool</dt>
            <dd class="mt-0.5 text-sm font-semibold leading-snug text-ink">{{ totalPrizePool }}</dd>
          </div>
        </div>
      </dl>
    </section>

    <!-- 4. ABOUT -->
    <SiteSectionReveal v-if="sections.some((s) => s.id === 'about')">
      <section id="about" class="section scroll-mt-28">
        <div class="container-site grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <h2 class="text-title">{{ secHeading('about', 'About the event') }}</h2>
            <!-- eslint-disable-next-line vue/no-v-html -- sanitised on write -->
            <div v-if="ev.description" class="prose-site mt-4" v-html="ev.description" />
            <p v-if="ev.audience" class="mt-4 text-sm text-ink-soft"><span class="font-bold text-ink">Who should join:</span> {{ ev.audience }}</p>
          </div>
          <div class="space-y-4">
            <div v-if="objectiveList.length" class="card p-5">
              <h3 class="text-base font-extrabold text-ink">Objectives</h3>
              <ul class="mt-3 space-y-2">
                <li v-for="(o, i) in objectiveList" :key="i" class="flex items-start gap-2.5 text-sm text-ink-soft">
                  <Icon name="lucide:target" class="mt-0.5 shrink-0 text-brand-600" /><span>{{ o }}</span>
                </li>
              </ul>
            </div>
            <div v-if="benefitList.length" class="card p-5">
              <h3 class="text-base font-extrabold text-ink">What you get</h3>
              <ul class="mt-3 space-y-2">
                <li v-for="(b, i) in benefitList" :key="i" class="flex items-start gap-2.5 text-sm text-ink-soft">
                  <Icon name="lucide:gift" class="mt-0.5 shrink-0 text-brand-600" /><span>{{ b }}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </SiteSectionReveal>

    <!-- 5. PRIZE POOL -->
    <SiteSectionReveal v-if="sections.some((s) => s.id === 'prizes')">
      <section id="prizes" class="section scroll-mt-28 !pt-0">
        <div class="container-site">
          <div class="flex flex-wrap items-end justify-between gap-3">
            <h2 class="text-title">{{ secHeading('prizes', 'Prize pool') }}</h2>
            <span v-if="totalPrizePool" class="badge badge-orange">Total: {{ totalPrizePool }}</span>
          </div>
          <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div
              v-for="(p, i) in ev.eventPrizes"
              :key="p.id"
              class="card p-5"
              :class="p.highlight ? 'border-brand-300 bg-brand-50/50 shadow-soft' : ''"
            >
              <span class="tile" :class="p.highlight ? 'tile-orange' : ['tile-blue', 'tile-purple', 'tile-green'][i % 3]">
                <Icon :name="p.highlight ? 'lucide:trophy' : 'lucide:award'" />
              </span>
              <p class="mt-3 text-xs font-bold uppercase tracking-wide text-ink-faint">{{ p.title }}</p>
              <p v-if="p.amount" class="mt-1 text-2xl font-extrabold tracking-tight text-brand-700">{{ p.amount }}</p>
              <p v-if="p.note" class="mt-1.5 text-sm text-ink-soft">{{ p.note }}</p>
            </div>
          </div>
        </div>
      </section>
    </SiteSectionReveal>

    <!-- 6. TIMELINE -->
    <SiteSectionReveal v-if="sections.some((s) => s.id === 'timeline')">
      <section id="timeline" class="section scroll-mt-28 !pt-0">
        <div class="container-site">
          <div class="mx-auto mb-12 max-w-2xl text-center">
            <h2 class="text-title">{{ secHeading('timeline', 'Event timeline') }}</h2>
            <p class="mt-3 text-ink-soft">The milestones that matter, from registration to the award ceremony.</p>
          </div>
          <SiteTimeline layout="horizontal" :items="timelineItems" />
        </div>
      </section>
    </SiteSectionReveal>

    <!-- 7. COMPETITION SEGMENTS -->
    <SiteSectionReveal v-if="sections.some((s) => s.id === 'competitions')">
      <section id="competitions" class="section scroll-mt-28 !pt-0">
        <div class="container-site">
          <div class="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 class="text-title">{{ secHeading('competitions', 'Competition segments') }}</h2>
              <p class="mt-2 max-w-lg text-ink-soft">Each segment has its own rules, prizes and registration window.</p>
            </div>
            <span v-if="openComps.length" class="badge badge-green">{{ openComps.length }} open for registration</span>
          </div>

          <div class="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <article v-for="c in ev.competitions" :key="c.id" class="card card-hover group flex flex-col overflow-hidden">
              <NuxtLink :to="`/events/${ev.slug}/${c.slug}`" class="relative block aspect-[16/9] overflow-hidden bg-mist-1">
                <img v-if="c.coverImage" :src="c.coverImage" :alt="c.name" class="img-zoom h-full w-full object-cover" loading="lazy" />
                <div v-else class="flex h-full w-full items-center justify-center text-ink-faint"><Icon name="lucide:trophy" class="text-3xl" /></div>
                <span v-if="c.registrationOpen" class="pill-open absolute left-3 top-3"><span class="dot-live" />Open</span>
                <span v-else class="pill-closed absolute left-3 top-3">Closed</span>
              </NuxtLink>

              <div class="flex flex-1 flex-col p-4 sm:p-5">
                <div class="flex flex-wrap items-center gap-1.5">
                  <span v-if="c.type" class="badge badge-blue">{{ c.type }}</span>
                  <span v-if="c.category" class="badge badge-purple">{{ c.category }}</span>
                </div>
                <h3 class="mt-2 text-lg font-extrabold leading-snug text-ink">
                  <NuxtLink :to="`/events/${ev.slug}/${c.slug}`" class="group-hover:text-brand-700">{{ c.name }}</NuxtLink>
                </h3>

                <dl class="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-ink-soft">
                  <div v-if="c.prizes[0]">
                    <dt class="font-semibold text-ink-faint">Top prize</dt>
                    <dd class="font-bold text-ink">{{ c.prizes[0].amount }}</dd>
                  </div>
                  <div>
                    <dt class="font-semibold text-ink-faint">Team size</dt>
                    <dd class="font-bold text-ink">{{ c.teamBased ? `Up to ${c.maxTeamSize}` : 'Individual' }}</dd>
                  </div>
                  <div v-if="c.registrationDeadline">
                    <dt class="font-semibold text-ink-faint">Deadline</dt>
                    <dd class="font-bold text-ink">{{ formatDate(c.registrationDeadline) }}</dd>
                  </div>
                  <div v-if="c.registeredTeams">
                    <dt class="font-semibold text-ink-faint">Registered</dt>
                    <dd class="font-bold text-ink">{{ c.registeredTeams }} teams</dd>
                  </div>
                </dl>

                <div class="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3.5">
                  <NuxtLink :to="`/events/${ev.slug}/${c.slug}`" class="btn-secondary !px-3 !py-1.5 !text-xs">View Details</NuxtLink>
                  <NuxtLink
                    v-if="c.registrationOpen"
                    :to="`/events/${ev.slug}/${c.slug}/register`"
                    class="btn-primary !px-3 !py-1.5 !text-xs"
                  >
                    Register
                  </NuxtLink>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>
    </SiteSectionReveal>

    <!-- 8. FULL-DAY SCHEDULE -->
    <SiteSectionReveal v-if="sections.some((s) => s.id === 'schedule')">
      <section id="schedule" class="section scroll-mt-28 !pt-0">
        <div class="container-site">
          <h2 class="text-title">{{ secHeading('schedule', 'Programme schedule') }}</h2>

          <div v-if="scheduleDays.length > 1 || ev.competitions.length > 1" class="mt-5 flex flex-wrap items-center gap-2">
            <template v-if="scheduleDays.length > 1">
              <button
                type="button"
                class="rounded-full px-3 py-1.5 text-sm font-bold transition"
                :class="scheduleDay === '' ? 'bg-brand-600 text-white' : 'bg-mist-1 text-ink-soft hover:text-ink'"
                @click="scheduleDay = ''"
              >
                All days
              </button>
              <button
                v-for="d in scheduleDays"
                :key="d"
                type="button"
                class="rounded-full px-3 py-1.5 text-sm font-bold transition"
                :class="scheduleDay === d ? 'bg-brand-600 text-white' : 'bg-mist-1 text-ink-soft hover:text-ink'"
                @click="scheduleDay = d"
              >
                {{ d ? formatDate(d) : 'Undated' }}
              </button>
            </template>
            <div v-if="ev.competitions.length > 1" class="ml-auto">
              <label class="sr-only" for="sched-comp">Filter by segment</label>
              <select id="sched-comp" v-model="scheduleComp" class="field !w-auto !py-2 text-sm">
                <option value="">All segments</option>
                <option v-for="c in ev.competitions" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>
          </div>

          <div class="mt-6 space-y-8">
            <div v-for="group in scheduleByDay" :key="group.date">
              <h3 v-if="group.date && scheduleDays.length > 1" class="mb-3 text-base font-extrabold text-ink">{{ formatDate(group.date) }}</h3>
              <ol class="card divide-y divide-line overflow-hidden">
                <li v-for="s in group.items" :key="s.id" class="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:gap-5">
                  <div class="w-28 shrink-0 text-sm font-extrabold tabular-nums text-brand-700">
                    {{ s.startTime || '—' }}<template v-if="s.endTime"> – {{ s.endTime }}</template>
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="font-bold text-ink">{{ s.title }}</p>
                    <p v-if="s.description" class="mt-0.5 text-sm text-ink-soft">{{ s.description }}</p>
                    <p class="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-faint">
                      <span v-if="s.sessionType" class="inline-flex items-center gap-1"><Icon name="lucide:tag" />{{ s.sessionType }}</span>
                      <span v-if="s.venue" class="inline-flex items-center gap-1"><Icon name="lucide:map-pin" />{{ s.venue }}</span>
                      <span v-if="s.speaker" class="inline-flex items-center gap-1"><Icon name="lucide:mic" />{{ s.speaker }}</span>
                      <span v-if="s.competitionId" class="badge badge-purple">{{ compName(s.competitionId) }}</span>
                    </p>
                  </div>
                </li>
              </ol>
            </div>
            <p v-if="!filteredSchedule.length" class="card p-6 text-center text-sm text-ink-soft">Nothing scheduled for this filter.</p>
          </div>
        </div>
      </section>
    </SiteSectionReveal>

    <!-- 9. JUDGING CRITERIA -->
    <SiteSectionReveal v-if="sections.some((s) => s.id === 'criteria')">
      <section id="criteria" class="section scroll-mt-28 !pt-0">
        <div class="container-site">
          <div class="flex flex-wrap items-end justify-between gap-3">
            <h2 class="text-title">{{ secHeading('criteria', 'Judging criteria') }}</h2>
            <span v-if="criteriaTotal" class="badge" :class="criteriaTotal === 100 ? 'badge-green' : 'badge-orange'">
              Total {{ criteriaTotal }}%
            </span>
          </div>
          <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div v-for="(k, i) in ev.criteria" :key="k.id" class="card p-5">
              <div class="flex items-center justify-between gap-3">
                <span class="tile" :class="['tile-blue', 'tile-purple', 'tile-green', 'tile-orange', 'tile-cyan'][i % 5]">
                  <Icon :name="k.icon || 'lucide:check-circle-2'" />
                </span>
                <span v-if="k.weight" class="text-2xl font-extrabold tabular-nums text-brand-700">{{ k.weight }}%</span>
              </div>
              <h3 class="mt-3 text-base font-extrabold text-ink">{{ k.name }}</h3>
              <p v-if="k.description" class="mt-1 text-sm text-ink-soft">{{ k.description }}</p>
              <div v-if="k.weight" class="mt-3 h-1.5 overflow-hidden rounded-full bg-mist-2" role="presentation">
                <div class="h-full rounded-full bg-brand-500" :style="{ width: `${Math.min(k.weight, 100)}%` }" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </SiteSectionReveal>

    <!-- 10. JUDGES -->
    <SiteSectionReveal v-if="sections.some((s) => s.id === 'people')">
      <section id="people" class="section scroll-mt-28 !pt-0">
        <div class="container-site">
          <h2 class="text-title">{{ secHeading('people', 'Judges') }}</h2>
          <p class="mt-2 text-ink-soft">Who evaluates your work, and which segments they judge.</p>
          <div class="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <article v-for="j in ev.judges" :key="j.id" class="card p-5">
              <div class="flex items-start gap-4">
                <img v-if="j.photoUrl" :src="j.photoUrl" :alt="j.name" class="h-16 w-16 shrink-0 rounded-2xl object-cover" loading="lazy" />
                <span v-else class="tile tile-blue h-16 w-16 shrink-0 text-xl">{{ j.name.charAt(0) }}</span>
                <div class="min-w-0">
                  <h3 class="text-base font-extrabold leading-snug text-ink">{{ j.name }}</h3>
                  <p v-if="j.title || j.organization" class="mt-0.5 text-sm text-ink-soft">
                    {{ [j.title, j.organization].filter(Boolean).join(' · ') }}
                  </p>
                  <a
                    v-if="j.socialUrl"
                    :href="j.socialUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-brand-700"
                  >
                    <Icon name="lucide:external-link" /> Profile
                  </a>
                </div>
              </div>
              <p v-if="j.bio" class="mt-3 line-clamp-3 text-sm text-ink-soft">{{ j.bio }}</p>
              <div v-if="j.competitions.length" class="mt-3 flex flex-wrap gap-1.5 border-t border-line pt-3">
                <span v-for="c in j.competitions" :key="c" class="badge badge-purple">{{ c }}</span>
              </div>
            </article>
          </div>
        </div>
      </section>
    </SiteSectionReveal>

    <!-- 11. SPONSORS -->
    <SiteSectionReveal v-if="sections.some((s) => s.id === 'sponsors')">
      <section id="sponsors" class="section scroll-mt-28 !pt-0">
        <div class="container-site">
          <h2 class="text-title text-center">{{ secHeading('sponsors', 'Sponsors & partners') }}</h2>
          <SiteSponsorWall class="mt-8" :sponsors="ev.sponsors" />
        </div>
      </section>
    </SiteSectionReveal>

    <!-- 12. VENUE -->
    <SiteSectionReveal v-if="sections.some((s) => s.id === 'venue')">
      <section id="venue" class="section scroll-mt-28 !pt-0">
        <div class="container-site">
          <h2 class="text-title">{{ secHeading('venue', ev.eventType === 'online' ? 'How to join' : 'Venue & location') }}</h2>
          <div class="mt-6 grid gap-6" :class="venueAsides ? 'lg:grid-cols-2' : ''">
            <div v-if="ev.eventType === 'online'" class="card p-5">
              <span class="tile tile-blue"><Icon name="lucide:video" /></span>
              <h3 class="mt-2.5 text-base font-extrabold text-ink">Online event</h3>
              <p class="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{{ ev.meetingInfo }}</p>
            </div>
            <SiteVenueMap
              v-else
              :name="venue.name"
              :address="venue.address"
              :directions="venue.directions"
              :map-embed="venue.mapEmbed"
            />
            <div v-if="venueAsides" class="space-y-4">
              <div v-if="ev.eventType === 'hybrid' && ev.meetingInfo" class="card p-5">
                <span class="tile tile-blue"><Icon name="lucide:video" /></span>
                <h3 class="mt-2.5 text-base font-extrabold text-ink">Joining online</h3>
                <p class="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{{ ev.meetingInfo }}</p>
              </div>
              <div v-if="ev.venueParking" class="card p-5">
                <span class="tile tile-cyan"><Icon name="lucide:car" /></span>
                <h3 class="mt-2.5 text-base font-extrabold text-ink">Parking</h3>
                <p class="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{{ ev.venueParking }}</p>
              </div>
              <div v-if="ev.contactPhone" class="card p-5">
                <span class="tile tile-green"><Icon name="lucide:phone" /></span>
                <h3 class="mt-2.5 text-base font-extrabold text-ink">Venue contact</h3>
                <p class="mt-1 text-sm font-semibold text-ink">{{ ev.contactPhone }}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </SiteSectionReveal>

    <!-- 13. GALLERY -->
    <SiteSectionReveal v-if="sections.some((s) => s.id === 'gallery')">
      <section id="gallery" class="section scroll-mt-28 !pt-0">
        <div class="container-site">
          <div class="mb-8 flex flex-wrap items-end justify-between gap-3">
            <h2 class="text-title">{{ secHeading('gallery', 'Gallery') }}</h2>
            <NuxtLink to="/gallery" class="link-underline text-sm text-brand-600">Full gallery</NuxtLink>
          </div>
          <UiImageGallery :images="galleryImages" />
        </div>
      </section>
    </SiteSectionReveal>

    <!-- 14. FAQ -->
    <SiteSectionReveal v-if="sections.some((s) => s.id === 'faq')">
      <section id="faq" class="section scroll-mt-28 !pt-0">
        <div class="container-site">
          <div class="mx-auto max-w-3xl">
            <h2 class="text-title text-center">{{ secHeading('faq', 'Frequently asked questions') }}</h2>
            <SiteFaqAccordion class="mt-8" :faqs="ev.faqs" />
          </div>
        </div>
      </section>
    </SiteSectionReveal>

    <!-- 15. REGISTRATION CTA -->
    <SiteSectionReveal v-if="secVisible('cta')">
      <section class="section !pt-0">
        <div class="container-site">
          <div class="card relative overflow-hidden bg-gradient-to-br from-brand-700 to-brand-500 p-8 text-center sm:p-12">
            <h2 class="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              {{ firstOpen ? 'Ready to compete?' : lifecycle.label }}
            </h2>
            <p class="mx-auto mt-2 max-w-xl text-sm text-white/85 sm:text-base">
              <template v-if="firstOpen">
                {{ openComps.length }} {{ openComps.length === 1 ? 'segment is' : 'segments are' }} accepting entries<template v-if="regDeadline"> until {{ formatDate(regDeadline) }}</template>.
                <template v-if="ev.entryFee"> Entry: {{ ev.entryFee }}.</template>
              </template>
              <template v-else-if="lifecycle.label === 'Event Completed'">
                Thanks to everyone who took part. See the gallery and winners for how it went.
              </template>
              <template v-else>Registration is not open right now. Check back soon.</template>
            </p>
            <div class="mt-6 flex flex-wrap items-center justify-center gap-3">
              <NuxtLink
                v-if="firstOpen"
                :to="`/events/${ev.slug}/${firstOpen.slug}/register`"
                class="btn-secondary !border-white !bg-white !text-brand-700"
              >
                Register Now <Icon name="lucide:arrow-right" />
              </NuxtLink>
              <a v-else-if="ev.contactEmail" :href="`mailto:${ev.contactEmail}`" class="btn-secondary !border-white/40 !bg-transparent !text-white">
                Contact the organisers
              </a>
            </div>
          </div>
        </div>
      </section>
    </SiteSectionReveal>
  </div>
</template>
