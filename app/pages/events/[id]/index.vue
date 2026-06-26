<script setup lang="ts">
import type { HackathonEvent } from '~/composables/useEvents'

const route = useRoute()
const eventId = route.params.id as string
const { event } = useEventById(eventId)

if (!event.value) {
  throw createError({ statusCode: 404, statusMessage: 'Event not found', fatal: true })
}

const ev = event.value as HackathonEvent

function statusBadgeClass(status: HackathonEvent['status']) {
  switch (status) {
    case 'ongoing': return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'upcoming': return 'bg-blue-50 text-blue-700 border-blue-200'
    case 'past': return 'bg-gray-100 text-gray-500 border-gray-200'
  }
}

function statusLabel(status: HackathonEvent['status']) {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

// Timeline data
const timelineItems = computed(() => {
  if (!ev) return []
  const now = new Date()
  const regDeadline = new Date(ev.registrationDeadline)
  const end = new Date(ev.endDate)
  return [
    {
      id: '1',
      title: 'Registration Opens',
      description: 'The registration period begins for all participants.',
      timestamp: ev.startDate,
      status: 'completed' as const
    },
    {
      id: '2',
      title: 'Registration Deadline',
      description: 'The final date to register and form teams.',
      timestamp: ev.registrationDeadline,
      status: now > regDeadline ? 'completed' as const : 'active' as const
    },
    {
      id: '3',
      title: 'Project Submission',
      description: 'Deadline to submit your projects and repositories.',
      timestamp: ev.endDate,
      status: now > end ? 'completed' as const : (now > regDeadline ? 'active' as const : 'pending' as const)
    },
    {
      id: '4',
      title: 'Winners Announced',
      description: 'The judging period concludes and winners are celebrated.',
      timestamp: ev.endDate,
      status: 'pending' as const
    }
  ]
})

// Prize tiers
const prizes = [
  { position: '1st Place', amount: ev.prize, icon: 'lucide:trophy', color: 'text-amber-500', bg: 'bg-amber-50' },
  { position: '2nd Place', amount: `${parseInt(ev.prize.replace(/[^\d]/g, '')) ? '৳' + Math.round(parseInt(ev.prize.replace(/[^\d]/g, '')) * 0.5).toLocaleString() : 'TBD'}`, icon: 'lucide:medal', color: 'text-gray-400', bg: 'bg-gray-50' },
  { position: '3rd Place', amount: `${parseInt(ev.prize.replace(/[^\d]/g, '')) ? '৳' + Math.round(parseInt(ev.prize.replace(/[^\d]/g, '')) * 0.25).toLocaleString() : 'TBD'}`, icon: 'lucide:award', color: 'text-orange-600', bg: 'bg-orange-50' },
]

// Removed hardcoded judges, sponsors, rules, and faqs

const faqOpen = ref<number | null>(1)
function toggleFaq(id: number) { faqOpen.value = faqOpen.value === id ? null : id }

const canRegister = computed(() => ev.status !== 'past' && new Date(ev.registrationDeadline) >= new Date())

useSeoMeta({
  title: ev.title,
  description: ev.description,
})
</script>

<template>
  <div v-if="ev">
    <!-- 1. HERO BANNER -->
    <section class="relative overflow-hidden">
      <div class="absolute inset-0 z-0">
        <img :src="ev.imageUrl" :alt="ev.title" class="h-full w-full object-cover" />
        <div class="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/30" />
      </div>
      <div class="container-site relative z-10 pb-12 pt-28">
        <SiteBackButton to="/events" label="All events" class="!border-white/20 !text-white/70 hover:!text-white" />
        <div class="mt-6 max-w-3xl">
          <div class="flex flex-wrap items-center gap-2">
            <span
              class="rounded-full border px-3 py-1 text-xs font-bold"
              :class="statusBadgeClass(ev.status)"
            >
              {{ statusLabel(ev.status) }}
            </span>
            <span class="text-sm font-semibold text-white/70">{{ ev.organizer }}</span>
          </div>
          <h1 class="mt-4 text-4xl font-extrabold tracking-tight text-white md:text-5xl lg:text-6xl">
            {{ ev.title }}
          </h1>
          <div class="mt-4 flex flex-wrap items-center gap-3">
            <span v-for="tag in ev.tags" :key="tag" class="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80 backdrop-blur-sm">
              {{ tag }}
            </span>
          </div>
        </div>
      </div>
    </section>

    <!-- 2. KEY STATS BAR -->
    <section class="container-site -mt-6 relative z-20">
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
            <p class="text-sm font-bold">{{ Math.floor(Math.random() * 300 + 120) }}+ registered</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Main content + sidebar -->
    <section class="container-site grid gap-8 py-12 lg:grid-cols-[1fr_340px]">
      <div class="card space-y-12 p-6 sm:p-8 md:p-10 bg-white">
        <!-- 3. ABOUT / DESCRIPTION -->
        <div>
          <h2 class="text-title">About this event</h2>
          <div class="prose-site mt-4">
            <p>{{ ev.description }}</p>
            <p>
              Join {{ ev.organizer }} for an incredible experience where participants will work in teams of {{ ev.teamSizeMin }}–{{ ev.teamSizeMax }}
              to build innovative solutions. Whether you're a seasoned developer or just starting out, this event offers mentorship, workshops, and
              networking opportunities alongside the competition.
            </p>
            <p>
              The event runs from <strong>{{ formatDate(ev.startDate) }}</strong> to <strong>{{ formatDate(ev.endDate) }}</strong>
              <template v-if="ev.location !== 'Online'"> at <strong>{{ ev.location }}</strong></template>.
              With a prize pool of <strong>{{ ev.prize }}</strong>, there's plenty of incentive to bring your best work.
            </p>
          </div>
        </div>

        <!-- WHO CAN PARTICIPATE -->
        <div v-if="ev.eligibility">
          <h2 class="text-title">Who can participate</h2>
          <div class="prose-site mt-4">
            <p>{{ ev.eligibility }}</p>
          </div>
        </div>

        <!-- 4. TIMELINE -->
        <div>
          <h2 class="text-title">Timeline</h2>
          <div class="mt-6">
            <SiteTimeline :items="timelineItems" />
          </div>
        </div>

        <!-- 5. PRIZES -->
        <div>
          <h2 class="text-title">Prizes</h2>
          <div class="mt-6 grid gap-4 sm:grid-cols-3">
            <div
              v-for="(p, i) in prizes"
              :key="i"
              class="card flex flex-col items-center p-6 text-center"
              :class="{ 'border-brand-200 shadow-soft': i === 0 }"
            >
              <span class="flex h-14 w-14 items-center justify-center rounded-full text-2xl" :class="[p.bg, p.color]">
                <Icon :name="p.icon" />
              </span>
              <p class="mt-3 text-sm font-bold text-ink-soft">{{ p.position }}</p>
              <p class="mt-1 text-2xl font-extrabold tracking-tight" :class="i === 0 ? 'text-brand-600' : 'text-ink'">
                {{ p.amount }}
              </p>
            </div>
          </div>
        </div>

        <!-- 6. JUDGES & MENTORS -->
        <div>
          <h2 class="text-title">Judges & Mentors</h2>
          <div class="mt-6 flex flex-wrap gap-4">
            <div v-for="j in ev.judges" :key="j.name" class="card flex items-center gap-3 p-4">
              <img :src="j.avatar" :alt="j.name" class="h-12 w-12 rounded-full object-cover" />
              <div>
                <p class="text-sm font-bold">{{ j.name }}</p>
                <p class="text-xs text-ink-faint">{{ j.role }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- LOCATION -->
        <div v-if="ev.location">
          <h2 class="text-title">Location</h2>
          <div class="mt-4 flex items-center gap-3">
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <Icon name="lucide:map-pin" />
            </span>
            <p class="font-medium text-ink">{{ ev.location }}</p>
          </div>
        </div>

        <!-- SPONSORS -->
        <div>
          <h2 class="text-title">Sponsors</h2>
          <div class="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            <div
              v-for="s in ev.sponsors"
              :key="s.name"
              class="card flex flex-col items-center justify-center gap-3 p-5 text-center bg-white"
            >
              <img :src="s.logo" :alt="s.name" class="h-12 w-auto max-w-full object-contain" />
              <span class="text-sm font-bold text-ink-soft">{{ s.name }}</span>
            </div>
          </div>
        </div>

        <!-- 7. RULES -->
        <div>
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

        <!-- 8. FAQ -->
        <div>
          <h2 class="text-title">Frequently Asked Questions</h2>
          <div class="mt-6 space-y-3">
            <div v-for="f in ev.faqs" :key="f.id" class="card overflow-hidden">
              <button
                type="button"
                class="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                :aria-expanded="faqOpen === f.id"
                @click="toggleFaq(f.id)"
              >
                <span class="font-bold tracking-tight">{{ f.question }}</span>
                <span
                  class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 transition-transform duration-300 ease-out-quart"
                  :class="{ 'rotate-45': faqOpen === f.id }"
                >
                  <Icon name="lucide:plus" />
                </span>
              </button>
              <div class="faq-panel" :class="{ 'faq-open': faqOpen === f.id }">
                <div class="overflow-hidden">
                  <p class="px-5 pb-5 text-sm leading-relaxed text-ink-soft">{{ f.answer }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- SIDEBAR -->
      <aside class="space-y-5">
        
        <!-- EVENT COUNTDOWN -->
        <div class="card p-6 flex flex-col items-center justify-center bg-white shadow-soft">
          <p class="mb-4 text-sm font-bold tracking-wide text-ink-soft uppercase">Event Starts In</p>
          <UiAnimatedNumberCountdown :end-date="ev.startDate" />
        </div>

        <!-- 9. REGISTER CTA (sticky) -->
        <div class="lg:sticky lg:top-20">
          <div v-if="canRegister" class="card bg-brand-600 p-6 text-white">
            <h3 class="text-xl font-extrabold">Ready to compete?</h3>
            <p class="mt-2 text-sm text-white/80">
              Form your team and register before the deadline.
              Registration takes about two minutes.
            </p>
            <NuxtLink
              :to="`/events/${ev.id}/register`"
              class="mt-5 flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3.5 text-sm font-bold text-brand-600 transition-transform hover:-translate-y-0.5 active:scale-95"
            >
              Register Now <Icon name="lucide:arrow-right" />
            </NuxtLink>
            <p class="mt-3 text-center text-xs text-white/60">
              Deadline: {{ formatDate(ev.registrationDeadline) }}
            </p>
          </div>
          <div v-else class="card p-6 text-center">
            <Icon name="lucide:clock" class="mx-auto text-3xl text-ink-faint" />
            <p class="mt-3 font-bold text-ink-soft">Registration Closed</p>
            <p class="mt-1 text-sm text-ink-faint">This event is no longer accepting registrations.</p>
          </div>

          <!-- Event details card -->
          <div class="card mt-5 p-5">
            <h3 class="text-sm font-bold text-ink-faint">Event Details</h3>
            <dl class="mt-3 space-y-3 text-sm">
              <div class="flex justify-between">
                <dt class="text-ink-faint">Start Date</dt>
                <dd class="font-bold">{{ formatDate(ev.startDate) }}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-ink-faint">End Date</dt>
                <dd class="font-bold">{{ formatDate(ev.endDate) }}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-ink-faint">Location</dt>
                <dd class="font-bold">{{ ev.location }}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-ink-faint">Prize Pool</dt>
                <dd class="font-bold text-brand-600">{{ ev.prize }}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-ink-faint">Team Size</dt>
                <dd class="font-bold">{{ ev.teamSizeMin }}–{{ ev.teamSizeMax }}</dd>
              </div>
            </dl>
            <a
              v-if="ev.website"
              :href="ev.website"
              target="_blank"
              rel="noopener"
              class="mt-4 flex items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-bold text-ink transition-colors hover:border-brand-300 hover:text-brand-600"
            >
              <Icon name="lucide:external-link" /> Visit Website
            </a>
          </div>
        </div>
      </aside>
    </section>
  </div>
</template>

<style scoped>
.faq-panel { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 300ms cubic-bezier(0.22, 1, 0.36, 1); }
.faq-open { grid-template-rows: 1fr; }
@media (prefers-reduced-motion: reduce) { .faq-panel { transition: none; } }
</style>
