<script setup lang="ts">
const { data: events } = await useFetch('/api/public/events')
useSeoMeta({ title: 'Past Editions', description: 'Previous editions of BICTA.' })
</script>

<template>
  <section class="container-site section">
    <SiteBackButton to="/" label="Back to home" />
    <h1 class="text-display mt-6">Previous editions</h1>
    <p class="mt-3 text-lg text-ink-soft">A look back at past BICTA events.</p>

    <div v-if="events?.length" class="mt-10 grid gap-5" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))">
      <NuxtLink
        v-for="ev in events"
        :key="ev.id"
        :to="`/events/${ev.slug}`"
        class="card card-hover group overflow-hidden"
      >
        <div class="img-zoom aspect-[16/9] w-full overflow-hidden bg-mist-2">
          <img v-if="ev.heroImage" :src="ev.heroImage" :alt="ev.title" loading="lazy" class="h-full w-full object-cover" />
          <div v-else class="flex h-full w-full items-center justify-center text-4xl font-extrabold text-ink-faint">{{ ev.year }}</div>
        </div>
        <div class="p-6">
          <p class="text-sm font-bold text-brand-600">{{ ev.year }}</p>
          <h2 class="mt-1 text-xl font-extrabold tracking-tight">{{ ev.title }}</h2>
          <p class="mt-1 text-sm text-ink-soft">
            {{ formatDateRange(ev.startDate, ev.endDate) }}<span v-if="ev.venue"> · {{ ev.venue }}</span>
          </p>
        </div>
      </NuxtLink>
    </div>
    <div v-else class="mt-16 text-center text-ink-faint">No past events yet.</div>
  </section>
</template>
