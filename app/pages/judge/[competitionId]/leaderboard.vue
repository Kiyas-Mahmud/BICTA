<script setup lang="ts">
definePageMeta({ layout: 'judge', middleware: 'judge' })

interface TeamRow {
  registrationId: number
  teamName: string | null
  fullName: string
  institution: string
  rank: number | null
  averageScore: number | null
  judgesCompleted: number
  judgesTotal: number
}

const route = useRoute()
const competitionId = Number(route.params.competitionId)

const { data, pending } = await useFetch<{ teams: TeamRow[] }>(`/api/judge/competitions/${competitionId}/leaderboard`)

useSeoMeta({ title: 'Leaderboard', robots: 'noindex' })
</script>

<template>
  <section class="container-site py-8 sm:py-12">
    <SiteBackButton :to="`/judge/${competitionId}`" label="Back to scoring" />

    <h1 class="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">Leaderboard</h1>
    <p class="mt-1 text-ink-soft">Live standings — updates as judges complete their marks.</p>

    <div v-if="pending" class="mt-8 text-sm text-ink-faint">Loading…</div>

    <div v-else-if="!data?.teams.length" class="card mt-8 p-10 text-center text-ink-soft">
      No confirmed teams yet for this competition.
    </div>

    <ul v-else class="mt-6 space-y-2.5">
      <li v-for="t in data.teams" :key="t.registrationId" class="card flex items-center justify-between gap-3 p-4">
        <div class="flex items-center gap-4">
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-extrabold text-brand-700">
            {{ t.rank ?? '—' }}
          </span>
          <div class="min-w-0">
            <p class="truncate font-bold text-ink">{{ t.teamName || t.fullName }}</p>
            <p v-if="t.institution" class="truncate text-xs text-ink-faint">{{ t.institution }}</p>
          </div>
        </div>
        <div class="flex shrink-0 items-center gap-3">
          <span class="badge" :class="t.judgesCompleted === t.judgesTotal && t.judgesTotal > 0 ? 'badge-green' : 'badge-orange'">
            {{ t.judgesCompleted }} of {{ t.judgesTotal }} judges
          </span>
          <span class="tabular-nums text-lg font-extrabold text-ink">{{ t.averageScore ?? '—' }}</span>
        </div>
      </li>
    </ul>
  </section>
</template>
