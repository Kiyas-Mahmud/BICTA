<script setup lang="ts">
import type { EventListing } from '~/composables/useEvents'

const route = useRoute()
const eventId = route.params.id as string
const { event } = useEventById(eventId)

if (!event.value) {
  throw createError({ statusCode: 404, statusMessage: 'Event not found', fatal: true })
}

const ev = event.value as EventListing

function statusBadgeClass(status: EventListing['status']) {
  if (status === 'ongoing') return 'badge badge-green'
  if (status === 'upcoming') return 'badge badge-blue'
  return 'badge badge-gray'
}

function statusLabel(status: EventListing['status']) {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

useSeoMeta({
  title: ev.title,
  description: ev.description || `${ev.title} — ${ev.competitions.length} competitions.`,
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
            <span class="text-sm font-semibold text-white/70">BICTA · {{ ev.year }}</span>
          </div>
          <h1 class="text-display mt-4 text-white">{{ ev.title }}</h1>
        </div>
      </div>
    </section>

    <!-- KEY STATS BAR -->
    <section class="container-site relative z-20 -mt-6">
      <div class="card grid grid-cols-2 gap-4 p-5 shadow-soft sm:p-6 md:grid-cols-4">
        <div class="flex items-center gap-3">
          <span class="tile tile-orange h-10 w-10 text-lg"><Icon name="lucide:calendar" /></span>
          <div>
            <p class="text-xs font-semibold text-ink-faint">Dates</p>
            <p class="text-sm font-bold">{{ formatDateRange(ev.startDate, ev.endDate) }}</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <span class="tile tile-green h-10 w-10 text-lg"><Icon name="lucide:map-pin" /></span>
          <div>
            <p class="text-xs font-semibold text-ink-faint">Venue</p>
            <p class="text-sm font-bold">{{ ev.venue }}</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <span class="tile tile-purple h-10 w-10 text-lg"><Icon name="lucide:trophy" /></span>
          <div>
            <p class="text-xs font-semibold text-ink-faint">Competitions</p>
            <p class="text-sm font-bold">{{ ev.competitions.length }}</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <span class="tile tile-blue h-10 w-10 text-lg"><Icon name="lucide:sparkles" /></span>
          <div>
            <p class="text-xs font-semibold text-ink-faint">Status</p>
            <p class="text-sm font-bold">{{ statusLabel(ev.status) }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- About + competitions -->
    <section class="container-site py-12">
      <div v-if="ev.description" class="card mb-10 bg-white p-6 sm:p-8">
        <h2 class="text-title">About this edition</h2>
        <div class="prose-site mt-4"><p>{{ ev.description }}</p></div>
      </div>

      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 class="text-title">Competitions</h2>
          <p class="mt-2 text-ink-soft">Pick your arena. Each track has its own rules and prizes.</p>
        </div>
      </div>

      <div v-if="ev.competitions.length" class="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <NuxtLink
          v-for="comp in ev.competitions"
          :key="comp.id"
          :to="`/events/${ev.id}/${comp.id}`"
          class="group card card-hover overflow-hidden"
        >
          <div class="relative aspect-[16/10] overflow-hidden">
            <img
              :src="comp.imageUrl"
              :alt="comp.name"
              loading="lazy"
              class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <span class="absolute left-3 top-3" :class="comp.registrationOpen ? 'pill-open' : 'pill-closed'">
              <span v-if="comp.registrationOpen" class="dot-live" />
              {{ comp.registrationOpen ? 'Registration open' : 'Registration closed' }}
            </span>
          </div>
          <div class="p-5">
            <p v-if="comp.type" class="text-xs font-semibold text-ink-faint">{{ comp.type }}</p>
            <h3 class="mt-1 text-lg font-extrabold leading-tight tracking-tight transition-colors group-hover:text-brand-600">
              {{ comp.name }}
            </h3>
            <p class="mt-3 flex items-center gap-1.5 text-sm font-bold text-brand-600">
              <Icon name="lucide:trophy" class="text-sm" /> {{ comp.prize }}
            </p>
          </div>
        </NuxtLink>
      </div>
      <div v-else class="mt-10 text-center">
        <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-mist-2 text-ink-faint">
          <Icon name="lucide:trophy" class="text-2xl" />
        </div>
        <p class="mt-4 font-bold text-ink-soft">No competitions announced yet</p>
        <p class="mt-1 text-sm text-ink-faint">Check back soon.</p>
      </div>
    </section>
  </div>
</template>
