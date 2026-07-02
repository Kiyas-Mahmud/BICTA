<script setup lang="ts">
import type { HackathonEvent } from '~/composables/useEvents'

const { events } = useEvents()

const activeFilter = ref<'all' | 'ongoing' | 'upcoming' | 'past'>('all')

const filteredEvents = computed(() => {
  if (activeFilter.value === 'all') return events.value
  return events.value.filter((e) => e.status === activeFilter.value)
})

const filters: { key: typeof activeFilter.value; label: string }[] = [
  { key: 'all', label: 'All Events' },
  { key: 'ongoing', label: 'Ongoing' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
]

function statusBadgeClass(status: HackathonEvent['status']) {
  switch (status) {
    case 'ongoing':
      return 'badge badge-green'
    case 'upcoming':
      return 'badge badge-blue'
    case 'past':
      return 'badge badge-gray'
  }
}

function statusLabel(status: HackathonEvent['status']) {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

const counts = computed(() => ({
  all: events.value.length,
  ongoing: events.value.filter((e) => e.status === 'ongoing').length,
  upcoming: events.value.filter((e) => e.status === 'upcoming').length,
  past: events.value.filter((e) => e.status === 'past').length,
}))

useSeoMeta({ title: 'Events', description: 'Browse hackathons, competitions, and tech events by BICTA.' })
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="relative overflow-hidden">
      <div class="hero-field" aria-hidden="true">
        <div class="float-blob float-blob-1" />
        <div class="float-blob float-blob-2" />
      </div>
      <div class="container-site pb-8 pt-10">
        <h1 class="text-display rise rise-1">Events</h1>
        <p class="rise rise-2 mt-3 max-w-lg text-lg text-ink-soft">
          Discover hackathons, competitions, and innovation challenges. Find your next opportunity to build, learn, and win.
        </p>
      </div>
    </section>

    <!-- Filter Tabs + List -->
    <section class="container-site pb-16">
      <!-- Filter tabs -->
      <div class="flex items-center gap-1 overflow-x-auto border-b border-line pb-px">
        <button
          v-for="f in filters"
          :key="f.key"
          type="button"
          class="relative shrink-0 px-4 py-3 text-sm font-semibold transition-colors"
          :class="activeFilter === f.key ? 'text-brand-600' : 'text-ink-faint hover:text-ink-soft'"
          @click="activeFilter = f.key"
        >
          {{ f.label }}
          <span
            class="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold"
            :class="activeFilter === f.key ? 'bg-brand-600 text-white' : 'bg-mist-2 text-ink-faint'"
          >
            {{ counts[f.key] }}
          </span>
          <!-- Active indicator -->
          <span
            v-if="activeFilter === f.key"
            class="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand-600 transition-all duration-300"
          />
        </button>
      </div>

      <!-- Event list -->
      <div v-if="filteredEvents.length" class="mt-6 space-y-4">
        <NuxtLink
          v-for="event in filteredEvents"
          :key="event.id"
          :to="`/events/${event.id}`"
          class="group card card-hover flex flex-col overflow-hidden sm:flex-row"
        >
          <!-- Thumbnail -->
          <div class="relative aspect-[16/9] w-full shrink-0 overflow-hidden bg-mist-2 sm:aspect-auto sm:w-56 md:w-64">
            <img
              :src="event.imageUrl"
              :alt="event.title"
              loading="lazy"
              class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <!-- Status badge on image -->
            <span
              class="absolute left-3 top-3 backdrop-blur-sm"
              :class="statusBadgeClass(event.status)"
            >
              {{ statusLabel(event.status) }}
            </span>
          </div>

          <!-- Content -->
          <div class="flex flex-1 flex-col justify-between p-4 sm:p-5">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <p class="text-xs font-semibold text-ink-faint">{{ event.organizer }}</p>
              </div>
              <h2 class="mt-1.5 text-lg font-extrabold leading-tight tracking-tight transition-colors group-hover:text-brand-600">
                {{ event.title }}
              </h2>
              <p class="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-soft">
                {{ event.description }}
              </p>
            </div>

            <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              <!-- Date -->
              <span class="flex items-center gap-1.5 text-xs font-semibold text-ink-faint">
                <Icon name="lucide:calendar" class="text-sm" />
                {{ formatDateRange(event.startDate, event.endDate) }}
              </span>
              <!-- Location -->
              <span class="flex items-center gap-1.5 text-xs font-semibold text-ink-faint">
                <Icon name="lucide:map-pin" class="text-sm" />
                {{ event.location }}
              </span>
              <!-- Prize -->
              <span class="flex items-center gap-1.5 text-xs font-bold text-brand-600">
                <Icon name="lucide:trophy" class="text-sm" />
                {{ event.prize }}
              </span>
              <!-- Tags -->
              <div class="hidden flex-wrap gap-1.5 lg:flex">
                <span
                  v-for="tag in event.tags.slice(0, 3)"
                  :key="tag"
                  class="rounded-full bg-mist-2 px-2 py-0.5 text-[11px] font-semibold text-ink-faint"
                >
                  {{ tag }}
                </span>
              </div>
            </div>
          </div>

          <!-- Arrow -->
          <div class="hidden items-center pr-5 sm:flex">
            <Icon
              name="lucide:arrow-right"
              class="text-lg text-ink-faint transition-all duration-200 group-hover:translate-x-1 group-hover:text-brand-600"
            />
          </div>
        </NuxtLink>
      </div>

      <!-- Empty state -->
      <div v-else class="mt-16 text-center">
        <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-mist-2 text-ink-faint">
          <Icon name="lucide:calendar-x" class="text-2xl" />
        </div>
        <p class="mt-4 font-bold text-ink-soft">No {{ activeFilter === 'all' ? '' : activeFilter }} events found</p>
        <p class="mt-1 text-sm text-ink-faint">Check back soon for new events.</p>
      </div>
    </section>
  </div>
</template>
