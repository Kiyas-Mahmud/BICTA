<script setup lang="ts">
import type { TimelineItem } from '~/components/site/Timeline.vue'

const route = useRoute()
const eventKey = route.params.id as string
const compKey = route.params.compId as string

const { data: comp } = await useFetch(
  `/api/public/events/${encodeURIComponent(eventKey)}/${encodeURIComponent(compKey)}`,
  { key: `competition-${eventKey}-${compKey}` },
)
if (!comp.value) {
  throw createError({ statusCode: 404, statusMessage: 'Competition not found', fatal: true })
}

const ev = computed(() => comp.value!.event)

// Canonical URL uses slugs. Legacy numeric links redirect permanently, but
// only during SSR: awaiting navigateTo inside setup on the client suspends the
// component and leaves the page blank until a manual refresh.
if (import.meta.server && (/^\d+$/.test(eventKey) || /^\d+$/.test(compKey)) && ev.value?.slug && comp.value.slug) {
  await navigateTo(`/events/${ev.value.slug}/${comp.value.slug}`, { redirectCode: 301 })
}

const now = useState('comp-now', () => Date.now())
onMounted(() => {
  const t = setInterval(() => (now.value = Date.now()), 30_000)
  onBeforeUnmount(() => clearInterval(t))
})

// Registration is open only while the switch is on and the deadline stands —
// the same two rules the server enforces on submit.
const deadlinePassed = computed(() => {
  const d = comp.value!.registrationDeadline
  return Boolean(d) && new Date(`${d}T23:59:59Z`).getTime() < now.value
})
const canRegister = computed(() => comp.value!.registrationOpen && !deadlinePassed.value)
const isComplete = computed(() => ev.value?.status === 'past')

const daysLeft = computed(() => {
  const d = comp.value!.registrationDeadline
  if (!d) return null
  return Math.ceil((new Date(`${d}T23:59:59Z`).getTime() - now.value) / 86_400_000)
})

const registrationState = computed(() => {
  if (isComplete.value) return { label: 'Event Completed', class: 'badge badge-gray', dot: false }
  if (canRegister.value) return { label: 'Registration Open', class: 'pill-open', dot: true }
  if (deadlinePassed.value) return { label: 'Registration Closed', class: 'badge badge-gray', dot: false }
  return { label: 'Coming Soon', class: 'badge badge-blue', dot: false }
})

const difficultyBadge = computed(() => {
  const d = comp.value!.difficulty
  if (d === 'beginner') return 'badge badge-green'
  if (d === 'intermediate') return 'badge badge-blue'
  if (d === 'advanced') return 'badge badge-purple'
  return ''
})

const prizeStyles = [
  { icon: 'lucide:trophy', tile: 'tile-orange' },
  { icon: 'lucide:medal', tile: 'tile-blue' },
  { icon: 'lucide:award', tile: 'tile-purple' },
]

// Milestone timeline comes from the parent event.
const timelineItems = computed<TimelineItem[]>(() => {
  const rows = comp.value!.timeline ?? []
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

const criteriaTotal = computed(() => comp.value!.criteria.reduce((a: number, c: any) => a + c.weight, 0))

const sections = computed(() => {
  const c = comp.value!
  return [
    { id: 'overview', label: 'Overview', show: Boolean(c.description) },
    { id: 'rules', label: 'Rules', show: Boolean(c.rules) },
    { id: 'submission', label: 'Submission', show: Boolean(c.submissionGuidelines) },
    { id: 'criteria', label: 'Judging', show: Boolean(c.evaluationCriteria) || c.criteria.length > 0 },
    { id: 'prizes', label: 'Prizes', show: c.prizes.length > 0 },
    { id: 'schedule', label: 'Schedule', show: c.schedule.length > 0 || timelineItems.value.length > 0 },
    { id: 'judges', label: 'Judges', show: c.judges.length > 0 },
    { id: 'resources', label: 'Resources', show: Boolean(c.resources) },
    { id: 'faq', label: 'FAQ', show: c.faqs.length > 0 },
  ].filter((s) => s.show)
})

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

const registerHref = computed(() => `/events/${ev.value?.slug ?? eventKey}/${comp.value!.slug}/register`)

useSeoMeta({
  title: () => `${comp.value!.name}${ev.value ? ` — ${ev.value.title}` : ''}`,
  description: () => (comp.value!.description || '').replace(/<[^>]+>/g, ' ').trim().slice(0, 160),
  ogImage: () => comp.value!.bannerImage || comp.value!.coverImage || undefined,
})
</script>

<template>
  <div v-if="comp">
    <!-- HERO — full viewport, cover image behind, content centred -->
    <section class="relative flex min-h-[100svh] flex-col overflow-hidden">
      <div class="absolute inset-0 z-0">
        <img
          v-if="comp.bannerImage || comp.coverImage"
          :src="comp.bannerImage || comp.coverImage!"
          :alt="comp.name"
          class="h-full w-full object-cover"
          fetchpriority="high"
        />
        <div
          class="absolute inset-0"
          :class="comp.bannerImage || comp.coverImage ? 'bg-ink/65' : 'bg-gradient-to-br from-brand-800 to-brand-600'"
        />
        <div v-if="comp.bannerImage || comp.coverImage" class="absolute inset-0 bg-gradient-to-t from-ink via-ink/35 to-ink/55" />
      </div>

      <div class="container-site relative z-10 pt-24">
        <SiteBackButton
          :to="`/events/${ev?.slug ?? eventKey}`"
          :label="ev?.title ?? 'Back to event'"
          class="!border-white/20 !bg-transparent !text-white/70 hover:!text-white"
        />
      </div>

      <div class="container-site relative z-10 flex flex-1 items-center justify-center py-10">
        <div class="mx-auto max-w-3xl text-center">
          <div class="rise rise-1 flex flex-wrap items-center justify-center gap-2">
            <span :class="registrationState.class"><span v-if="registrationState.dot" class="dot-live" />{{ registrationState.label }}</span>
            <span v-if="comp.type" class="badge badge-blue">{{ comp.type }}</span>
            <span v-if="comp.category" class="badge badge-purple">{{ comp.category }}</span>
            <span v-if="comp.difficulty" :class="difficultyBadge" class="capitalize">{{ comp.difficulty }}</span>
          </div>

          <h1 class="rise rise-2 mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
            {{ comp.name }}
          </h1>

          <p class="rise rise-3 mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm font-semibold text-white/75">
            <span class="inline-flex items-center gap-1.5">
              <Icon name="lucide:users" /> {{ comp.teamBased ? `Teams of up to ${comp.maxTeamSize}` : 'Individual entry' }}
            </span>
            <span v-if="comp.prizes[0]" class="inline-flex items-center gap-1.5">
              <Icon name="lucide:trophy" /> {{ comp.prizes[0].amount }} top prize
            </span>
            <span v-if="comp.registeredTeams" class="inline-flex items-center gap-1.5">
              <Icon name="lucide:user-check" /> {{ comp.registeredTeams }} teams registered
            </span>
            <span v-if="comp.registrationDeadline" class="inline-flex items-center gap-1.5">
              <Icon name="lucide:clock" /> Closes {{ formatDate(comp.registrationDeadline) }}
            </span>
          </p>

          <div class="rise rise-4 mt-8 flex flex-col items-stretch gap-2.5 sm:flex-row sm:items-center sm:justify-center">
            <NuxtLink v-if="canRegister" :to="registerHref" class="btn-primary w-full justify-center sm:w-auto">
              Register Now <Icon name="lucide:arrow-right" />
            </NuxtLink>
            <span v-else class="rounded-full bg-white/10 px-4 py-2.5 text-center text-sm font-bold text-white/70">
              {{ registrationState.label }}
            </span>
            <NuxtLink :to="`/events/${ev?.slug ?? eventKey}`" class="btn-secondary w-full justify-center sm:w-auto">
              All segments
            </NuxtLink>
          </div>

          <p v-if="canRegister && daysLeft !== null && daysLeft <= 7" class="mt-4 text-sm font-bold text-white">
            <Icon name="lucide:triangle-alert" />
            {{ daysLeft <= 0 ? 'Registration closes today.' : `Only ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left to register.` }}
          </p>
        </div>
      </div>

      <div class="relative z-10 flex justify-center pb-8" aria-hidden="true">
        <a href="#overview" class="rounded-full p-2 text-white/50 transition hover:text-white">
          <Icon name="lucide:chevron-down" class="text-2xl" />
        </a>
      </div>
    </section>

    <!-- STICKY SECTION NAV -->
    <nav v-if="sections.length > 1" class="sticky top-16 z-30 border-b border-line bg-white/95 sm:top-[4.25rem]" aria-label="Competition sections">
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
        <NuxtLink v-if="canRegister" :to="registerHref" class="btn-primary ml-auto shrink-0 !px-3.5 !py-1.5 !text-xs">
          Register
        </NuxtLink>
      </div>
    </nav>

    <!-- completed notice -->
    <section v-if="isComplete" class="container-site pt-8">
      <div class="card flex items-start gap-3 border-brand-200 bg-brand-50/40 p-5">
        <span class="tile tile-purple shrink-0"><Icon name="lucide:flag" /></span>
        <div>
          <h2 class="text-base font-extrabold text-ink">This competition has finished</h2>
          <p class="mt-1 text-sm text-ink-soft">
            Photos are in the
            <NuxtLink :to="`/events/${ev?.slug ?? eventKey}#gallery`" class="link-underline text-brand-600">event gallery</NuxtLink>.
          </p>
        </div>
      </div>
    </section>

    <div class="container-site section grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-start">
      <!-- MAIN COLUMN -->
      <div class="space-y-10">
        <section v-if="comp.description" id="overview" class="scroll-mt-28">
          <h2 class="text-title">Overview</h2>
          <!-- eslint-disable-next-line vue/no-v-html -- sanitised on write -->
          <div class="prose-site mt-4" v-html="comp.description" />
        </section>

        <section v-if="comp.rules" id="rules" class="scroll-mt-28">
          <h2 class="text-title">Rules & eligibility</h2>
          <!-- eslint-disable-next-line vue/no-v-html -- sanitised on write -->
          <div class="prose-site mt-4" v-html="comp.rules" />
        </section>

        <section v-if="comp.submissionGuidelines" id="submission" class="scroll-mt-28">
          <h2 class="text-title">Submission guidelines</h2>
          <!-- eslint-disable-next-line vue/no-v-html -- sanitised on write -->
          <div class="prose-site mt-4" v-html="comp.submissionGuidelines" />
        </section>

        <section v-if="comp.evaluationCriteria || comp.criteria.length" id="criteria" class="scroll-mt-28">
          <div class="flex flex-wrap items-end justify-between gap-3">
            <h2 class="text-title">How entries are judged</h2>
            <span v-if="criteriaTotal" class="badge" :class="criteriaTotal === 100 ? 'badge-green' : 'badge-orange'">
              Total {{ criteriaTotal }}%
            </span>
          </div>

          <div v-if="comp.criteria.length" class="mt-5 grid gap-4 sm:grid-cols-2">
            <div v-for="(k, i) in comp.criteria" :key="k.id" class="card p-5">
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

          <!-- eslint-disable-next-line vue/no-v-html -- sanitised on write -->
          <div v-if="comp.evaluationCriteria" class="prose-site mt-4" v-html="comp.evaluationCriteria" />
        </section>

        <section v-if="comp.schedule.length || timelineItems.length" id="schedule" class="scroll-mt-28">
          <h2 class="text-title">Schedule</h2>

          <ol v-if="comp.schedule.length" class="card mt-5 divide-y divide-line overflow-hidden">
            <li v-for="s in comp.schedule" :key="s.id" class="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:gap-5">
              <div class="w-32 shrink-0 text-sm font-extrabold tabular-nums text-brand-700">
                <span v-if="s.date" class="block text-xs font-semibold text-ink-faint">{{ formatDate(s.date) }}</span>
                {{ s.startTime || '—' }}<template v-if="s.endTime"> – {{ s.endTime }}</template>
              </div>
              <div class="min-w-0 flex-1">
                <p class="font-bold text-ink">{{ s.title }}</p>
                <p v-if="s.description" class="mt-0.5 text-sm text-ink-soft">{{ s.description }}</p>
                <p v-if="s.venue || s.speaker" class="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-faint">
                  <span v-if="s.venue" class="inline-flex items-center gap-1"><Icon name="lucide:map-pin" />{{ s.venue }}</span>
                  <span v-if="s.speaker" class="inline-flex items-center gap-1"><Icon name="lucide:mic" />{{ s.speaker }}</span>
                </p>
              </div>
            </li>
          </ol>

          <div v-if="timelineItems.length" class="mt-6">
            <h3 class="mb-4 text-base font-extrabold text-ink">Event milestones</h3>
            <SiteTimeline layout="vertical" :items="timelineItems" />
          </div>
        </section>

        <section v-if="comp.judges.length" id="judges" class="scroll-mt-28">
          <h2 class="text-title">Judges</h2>
          <div class="mt-6 grid gap-4 sm:grid-cols-2">
            <SitePersonCard v-for="j in comp.judges" :key="j.id" :person="j" />
          </div>
        </section>

        <section v-if="comp.resources" id="resources" class="scroll-mt-28">
          <h2 class="text-title">Resources</h2>
          <!-- eslint-disable-next-line vue/no-v-html -- sanitised on write -->
          <div class="prose-site mt-4" v-html="comp.resources" />
        </section>

        <section v-if="comp.faqs.length" id="faq" class="scroll-mt-28">
          <h2 class="text-title">Questions about this competition</h2>
          <SiteFaqAccordion class="mt-6" :faqs="comp.faqs" />
        </section>
      </div>

      <!-- SIDEBAR -->
      <aside class="space-y-4 lg:sticky lg:top-28">
        <div class="card p-5">
          <h2 class="text-base font-extrabold text-ink">At a glance</h2>
          <dl class="mt-3 space-y-2.5 text-sm">
            <div v-if="ev" class="flex justify-between gap-3">
              <dt class="text-ink-faint">Event</dt>
              <dd class="text-right font-semibold">
                <NuxtLink :to="`/events/${ev.slug}`" class="link-underline text-brand-700">{{ ev.title }}</NuxtLink>
              </dd>
            </div>
            <div v-if="comp.category" class="flex justify-between gap-3">
              <dt class="text-ink-faint">Category</dt>
              <dd class="font-semibold text-ink">{{ comp.category }}</dd>
            </div>
            <div v-if="comp.difficulty" class="flex justify-between gap-3">
              <dt class="text-ink-faint">Difficulty</dt>
              <dd class="font-semibold capitalize text-ink">{{ comp.difficulty }}</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="text-ink-faint">Format</dt>
              <dd class="font-semibold text-ink">{{ comp.teamBased ? `Teams of up to ${comp.maxTeamSize}` : 'Individual' }}</dd>
            </div>
            <div v-if="comp.registrationDeadline" class="flex justify-between gap-3">
              <dt class="text-ink-faint">Deadline</dt>
              <dd class="font-semibold text-ink">{{ formatDate(comp.registrationDeadline) }}</dd>
            </div>
            <div v-if="comp.registeredTeams" class="flex justify-between gap-3">
              <dt class="text-ink-faint">Registered</dt>
              <dd class="font-semibold text-ink">{{ comp.registeredTeams }} teams</dd>
            </div>
            <div v-if="ev?.entryFee" class="flex justify-between gap-3">
              <dt class="text-ink-faint">Entry fee</dt>
              <dd class="font-semibold text-ink">{{ ev.entryFee }}</dd>
            </div>
          </dl>

          <NuxtLink v-if="canRegister" :to="registerHref" class="btn-primary mt-4 w-full justify-center">
            Register <Icon name="lucide:arrow-right" />
          </NuxtLink>
          <p v-else class="mt-4 rounded-xl bg-mist-1 p-3 text-center text-xs font-semibold text-ink-soft">
            {{ deadlinePassed ? 'Registration has closed for this competition.' : 'Registration is not open yet.' }}
          </p>
        </div>

        <div v-if="comp.prizes.length" id="prizes" class="card scroll-mt-28 p-5">
          <h2 class="text-base font-extrabold text-ink">Prizes</h2>
          <ul class="mt-3 space-y-3">
            <li v-for="(p, i) in comp.prizes" :key="p.id" class="flex items-start gap-3">
              <span class="tile shrink-0" :class="prizeStyles[Math.min(i, prizeStyles.length - 1)]!.tile">
                <Icon :name="prizeStyles[Math.min(i, prizeStyles.length - 1)]!.icon" />
              </span>
              <div class="min-w-0">
                <p class="text-xs font-bold uppercase tracking-wide text-ink-faint">{{ p.position }}</p>
                <p class="text-base font-extrabold text-brand-700">{{ p.amount }}</p>
                <p v-if="p.note" class="mt-0.5 text-xs text-ink-soft">{{ p.note }}</p>
              </div>
            </li>
          </ul>
        </div>

        <div v-if="ev" class="card p-5">
          <h2 class="text-base font-extrabold text-ink">More in this event</h2>
          <p class="mt-1 text-sm text-ink-soft">See every segment, the schedule, judges and venue.</p>
          <NuxtLink :to="`/events/${ev.slug}`" class="btn-secondary mt-3 w-full justify-center">
            Back to {{ ev.title }}
          </NuxtLink>
        </div>
      </aside>
    </div>

    <!-- Mobile registration lives in the sticky section nav above; the bottom
         edge belongs to the site's fixed mobile navigation (.nav-bottom). -->
  </div>
</template>
