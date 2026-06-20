<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const { data: stats } = await useFetch('/api/admin/stats')

const cards = computed(() => [
  { label: 'Events', value: stats.value?.events ?? 0, to: '/admin/events' },
  { label: 'Competitions', value: stats.value?.competitions ?? 0, to: '/admin/events' },
  { label: 'News', value: stats.value?.news ?? 0, to: '/admin/news' },
  { label: 'Registrations', value: stats.value?.registrations ?? 0, to: '/admin/registrations' },
])
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold tracking-tight">Dashboard</h1>

    <div class="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
      <NuxtLink
        v-for="card in cards"
        :key="card.label"
        :to="card.to"
        class="rounded-xl border border-line bg-white p-5 transition-shadow hover:shadow-md"
      >
        <p class="text-sm text-ink-soft">{{ card.label }}</p>
        <p class="mt-1 text-3xl font-bold">{{ card.value }}</p>
      </NuxtLink>
    </div>

    <div class="mt-6 rounded-xl border border-line bg-white p-5">
      <p class="text-sm text-ink-soft">Current event</p>
      <p v-if="stats?.currentEvent" class="mt-1 text-lg font-semibold">
        {{ stats.currentEvent.title }} ({{ stats.currentEvent.year }})
      </p>
      <p v-else class="mt-1 text-ink-faint">
        No current event set —
        <NuxtLink to="/admin/events" class="text-accent hover:underline">create one</NuxtLink>.
      </p>
    </div>
  </div>
</template>
