<script setup lang="ts">
import type { HackathonEvent } from '~/composables/useEvents'
import type { TimelineItem } from '~/components/site/Timeline.vue'

const route = useRoute()
const eventId = route.params.id as string
const { event } = useEventById(eventId)

if (!event.value) {
  throw createError({ statusCode: 404, statusMessage: 'Event not found', fatal: true })
}

const ev = event.value as HackathonEvent

function statusBadgeClass(status: HackathonEvent['status']) {
  if (status === 'ongoing') return 'badge badge-green'
  if (status === 'upcoming') return 'badge badge-blue'
  return 'badge badge-gray'
}

function statusLabel(status: HackathonEvent['status']) {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

const timelineItems = computed<TimelineItem[]>(() => {
  if (!ev) return []
  const now = new Date()
  const regDeadline = new Date(ev.registrationDeadline)
  const end = new Date(ev.endDate)
  return [
    { id: '1', title: 'Registration Opens', description: 'The registration period begins for all participants.', timestamp: ev.startDate, status: 'completed' },
    { id: '2', title: 'Registration Deadline', description: 'The final date to register and form teams.', timestamp: ev.registrationDeadline, status: now > regDeadline ? 'completed' : 'active' },
    { id: '3', title: 'Project Submission', description: 'Deadline to submit your projects and repositories.', timestamp: ev.endDate, status: now > end ? 'completed' : now > regDeadline ? 'active' : 'pending' },
    { id: '4', title: 'Winners Announced', description: 'The judging period concludes and winners are celebrated.', timestamp: ev.endDate, status: 'pending' },
  ]
})

// Real prize rows from the admin DB (no derived/fake amounts).
const prizeStyles = [
  { icon: 'lucide:trophy', chip: 'badge-amber' },
  { icon: 'lucide:medal', chip: 'badge-gray' },
  { icon: 'lucide:award', chip: 'badge-orange' },
]

// Shared component shapes.
const judgeCards = computed(() =>
  ev.judges.map((j, i) => ({
    id: i,
    name: j.name,
    title: j.role,
    organization: '',
    photoUrl: j.avatar,
    bio: '',
    socialUrl: null,
  })),
)
const sponsorCards = computed(() =>
  ev.sponsors.map((s, i) => ({ id: i, name: s.name, logoUrl: s.logo, websiteUrl: null, tier: 'Sponsors' })),
)

const canRegister = computed(() => ev.status !== 'past' && new Date(ev.registrationDeadline) >= new Date())

useSeoMeta({
  title: ev.title,
  description: ev.description,
})
</script>

<template>
  <div v-if="ev">
    <!-- HERO BANNER -->
    <section class="relative overflow-hidden">
      <div class="absolute inset-0 z-0">
        <img :src="ev.imageUrl" :alt="ev.title" class="h-full w-full object-cover" />
        <div class="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/30" />
      </div>
      <div class="container-site relative z-10 pb-12 pt-28">
        <SiteBackButton to="/events" label="All events" class="!border-white/20 !bg-transparent !text-white/70 hover:!text-white" />
        <div class="mt-6 max-w-3xl">
          <div class="flex flex-wrap items-center gap-2">
            <span :class="statusBadgeClass(ev.status)">{{ statusLabel(ev.status) }}</span>
            <span class="text-sm font-semibold text-white/70">{{ ev.organizer }}</span>
          </div>
          <h1 class="text-display mt-4 text-white">{{ ev.title }}</h1>
          <div class="mt-4 flex flex-wrap items-center gap-3">
            <span v-for="tag in ev.tags" :key="tag" class="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80 backdrop-blur-sm">
              {{ tag }}
            </span>
          </div>
        </div>
      </div>
    </section>

    <!-- KEY STATS BAR -->
    <section class="container-site relative z-20 -mt-6">
      <div class="card grid grid-cols-2 gap-4 p-5 shadow-soft sm:p-6 md:grid-cols-5">
        <div class="flex items-center gap-3">
          <span class="tile tile-blue h-10 w-10 text-lg"><Icon name="lucide:trophy" /></span>
          <div>
            <p class="text-xs font-semibold text-ink-faint">Prize Pool</p>
            <p class="text-lg font-extrabold tracking-tight text-brand-600">{{ ev.prize }}</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <span class="tile tile-orange h-10 w-10 text-lg"><Icon name="lucide:calendar" /></span>
          <div>
            <p class="text-xs font-semibold text-ink-faint">Deadline</p>
            <p class="text-sm font-bold">{{ formatDate(ev.registrationDeadline) }}</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <span class="tile tile-purple h-10 w-10 text-lg"><Icon name="lucide:users" /></span>
          <div>
            <p class="text-xs font-semibold text-ink-faint">Team Size</p>
            <p class="text-sm font-bold">{{ ev.teamSizeMin }}–{{ ev.teamSizeMax }} members</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <span class="tile tile-green h-10 w-10 text-lg"><Icon name="lucide:map-pin" /></span>
          <div>
            <p class="text-xs font-semibold text-ink-faint">Location</p>
            <p class="text-sm font-bold">{{ ev.location }}</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <span class="tile tile-cyan h-10 w-10 text-lg"><Icon name="lucide:user-check" /></span>
          <div>
            <p class="text-xs font-semibold text-ink-faint">Participants</p>
            <p class="text-sm font-bold">{{ ev.registeredCount }} registered</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Main content + sidebar -->
    <section class="container-site grid gap-8 py-12 lg:grid-cols-[1fr_340px]">
      <div class="card space-y-12 bg-white p-6 sm:p-8 md:p-10">
        <!-- ABOUT -->
        <div>
          <h2 class="text-title">About this event</h2>
          <div class="prose-site mt-4">
            <p>{{ ev.description }}</p>
            <p>
              The event runs from <strong>{{ formatDate(ev.startDate) }}</strong> to <strong>{{ formatDate(ev.endDate) }}</strong>
              <template v-if="ev.location !== 'Online'"> at <strong>{{ ev.location }}</strong></template>.
              Teams of {{ ev.teamSizeMin }}–{{ ev.teamSizeMax }} compete for a prize pool of <strong>{{ ev.prize }}</strong>.
            </p>
          </div>
        </div>

        <div v-if="ev.eligibility">
          <h2 class="text-title">Who can participate</h2>
          <div class="prose-site mt-4"><p>{{ ev.eligibility }}</p></div>
        </div>

        <!-- TIMELINE -->
        <div>
          <h2 class="text-title">Timeline</h2>
          <div class="mt-6"><SiteTimeline layout="vertical" :items="timelineItems" /></div>
        </div>

        <!-- PRIZES (real rows from admin) -->
        <div v-if="ev.prizes.length">
          <h2 class="text-title">Prizes</h2>
          <div class="mt-6 grid gap-4 sm:grid-cols-3">
            <div
              v-for="(p, i) in ev.prizes"
              :key="i"
              class="card flex flex-col items-center p-6 text-center"
              :class="{ 'border-brand-200 shadow-soft': i === 0 }"
            >
              <span class="flex h-14 w-14 items-center justify-center rounded-full text-2xl" :class="prizeStyles[Math.min(i, prizeStyles.length - 1)].chip">
                <Icon :name="prizeStyles[Math.min(i, prizeStyles.length - 1)].icon" />
              </span>
              <p class="mt-3 text-sm font-bold text-ink-soft">{{ p.position }}</p>
              <p class="mt-1 text-2xl font-extrabold tracking-tight" :class="i === 0 ? 'text-brand-600' : 'text-ink'">{{ p.amount }}</p>
              <p v-if="p.note" class="mt-1 text-xs text-ink-faint">{{ p.note }}</p>
            </div>
          </div>
        </div>

        <!-- JUDGES -->
        <div v-if="judgeCards.length">
          <h2 class="text-title">Judges & Mentors</h2>
          <div class="mt-6 grid gap-4" style="grid-template-columns: repeat(auto-fill, minmax(200px, 1fr))">
            <SitePersonCard v-for="j in judgeCards" :key="j.id" :person="j" />
          </div>
        </div>

        <!-- SPONSORS -->
        <div v-if="sponsorCards.length">
          <h2 class="text-title">Sponsors</h2>
          <SiteSponsorWall class="mt-6" :sponsors="sponsorCards" />
        </div>

        <!-- RULES -->
        <div v-if="ev.rules.length">
          <h2 class="text-title">Rules</h2>
          <ul class="mt-4 space-y-3">
            <li v-for="(rule, i) in ev.rules" :key="i" class="flex gap-3 text-sm leading-relaxed text-ink-soft">
              <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-600">
                {{ i + 1 }}
              </span>
              {{ rule }}
            </li>
          </ul>
        </div>

        <!-- FAQ (shared accordion) -->
        <div v-if="ev.faqs.length">
          <h2 class="text-title">Frequently Asked Questions</h2>
          <SiteFaqAccordion class="mt-4" :faqs="ev.faqs" />
        </div>
      </div>

      <!-- SIDEBAR -->
      <aside class="space-y-5">
        <div class="card flex flex-col items-center justify-center bg-white p-6 shadow-soft">
          <p class="mb-4 text-sm font-bold uppercase tracking-wide text-ink-soft">Event Starts In</p>
          <UiAnimatedNumberCountdown :end-date="ev.startDate" />
        </div>

        <div class="lg:sticky lg:top-20">
          <div v-if="canRegister" class="card bg-brand-600 p-6 text-white">
            <h3 class="text-xl font-extrabold">Ready to compete?</h3>
            <p class="mt-2 text-sm text-white/80">Form your team and register before the deadline. Registration takes about two minutes.</p>
            <NuxtLink
              :to="`/events/${ev.id}/register`"
              class="mt-5 flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3.5 text-sm font-bold text-brand-600 transition-transform hover:-translate-y-0.5 active:scale-95"
            >
              Register Now <Icon name="lucide:arrow-right" />
            </NuxtLink>
            <p class="mt-3 text-center text-xs text-white/60">Deadline: {{ formatDate(ev.registrationDeadline) }}</p>
          </div>
          <div v-else class="card p-6 text-center">
            <Icon name="lucide:clock" class="mx-auto text-3xl text-ink-faint" />
            <p class="mt-3 font-bold text-ink-soft">Registration Closed</p>
            <p class="mt-1 text-sm text-ink-faint">This event is no longer accepting registrations.</p>
          </div>

          <div class="card mt-5 p-5">
            <h3 class="text-sm font-bold text-ink-faint">Event Details</h3>
            <dl class="mt-3 space-y-3 text-sm">
              <div class="flex justify-between"><dt class="text-ink-faint">Start Date</dt><dd class="font-bold">{{ formatDate(ev.startDate) }}</dd></div>
              <div class="flex justify-between"><dt class="text-ink-faint">End Date</dt><dd class="font-bold">{{ formatDate(ev.endDate) }}</dd></div>
              <div class="flex justify-between"><dt class="text-ink-faint">Location</dt><dd class="font-bold">{{ ev.location }}</dd></div>
              <div class="flex justify-between"><dt class="text-ink-faint">Prize Pool</dt><dd class="font-bold text-brand-600">{{ ev.prize }}</dd></div>
              <div class="flex justify-between"><dt class="text-ink-faint">Team Size</dt><dd class="font-bold">{{ ev.teamSizeMin }}–{{ ev.teamSizeMax }}</dd></div>
            </dl>
            <a
              v-if="ev.website"
              :href="ev.website"
              target="_blank"
              rel="noopener"
              class="btn-secondary mt-4 w-full"
            >
              <Icon name="lucide:external-link" /> Visit Website
            </a>
          </div>
        </div>
      </aside>
    </section>
  </div>
</template>
