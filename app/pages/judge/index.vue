<script setup lang="ts">
definePageMeta({ layout: 'judge', middleware: 'judge' })

interface JudgeCompetition {
  id: number
  name: string
  slug: string
  judgingOpen: boolean
  eventId: number
  eventTitle: string
  teamCount: number
  criteriaCount: number
}

const { data: competitions, pending } = await useFetch<JudgeCompetition[]>('/api/judge/competitions')

useSeoMeta({ title: 'My competitions', robots: 'noindex' })
</script>

<template>
  <section class="container-site py-8 sm:py-12">
    <h1 class="text-2xl font-extrabold tracking-tight sm:text-3xl">Your competitions</h1>
    <p class="mt-1 text-ink-soft">Score teams and check standings for each competition you're assigned to judge.</p>

    <div v-if="pending" class="mt-8 text-sm text-ink-faint">Loading…</div>

    <div v-else-if="competitions?.length" class="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="c in competitions" :key="c.id" class="card p-6">
        <p class="text-xs font-bold uppercase tracking-wide text-brand-600">{{ c.eventTitle }}</p>
        <h2 class="mt-1 text-lg font-extrabold tracking-tight">{{ c.name }}</h2>

        <div class="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span class="badge" :class="c.judgingOpen ? 'badge-green' : 'badge-gray'">
            {{ c.judgingOpen ? 'Judging open' : 'Judging closed' }}
          </span>
          <span class="text-ink-faint">{{ c.teamCount }} {{ c.teamCount === 1 ? 'team' : 'teams' }}</span>
        </div>

        <div class="mt-5 flex flex-wrap gap-2">
          <NuxtLink :to="`/judge/${c.id}`" class="btn-primary !py-2.5 text-sm">
            <Icon name="lucide:pencil" /> Score teams
          </NuxtLink>
          <NuxtLink :to="`/judge/${c.id}/leaderboard`" class="btn-secondary !py-2.5 text-sm">
            <Icon name="lucide:bar-chart-3" /> Leaderboard
          </NuxtLink>
        </div>
      </div>
    </div>

    <div v-else class="card mt-8 p-10 text-center text-ink-soft">
      You're not assigned to judge any competition yet. Contact the organisers if you were expecting one.
    </div>
  </section>
</template>
