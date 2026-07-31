<script setup lang="ts">
definePageMeta({ layout: 'judge', middleware: 'judge' })

interface Team {
  id: number
  teamName: string | null
  fullName: string
  institution: string
  complete: boolean
}

const route = useRoute()
const competitionId = Number(route.params.competitionId)

const { data, pending } = await useFetch(`/api/judge/competitions/${competitionId}/teams`)

useSeoMeta({ title: () => data.value?.competition.name ?? 'Score teams', robots: 'noindex' })
</script>

<template>
  <section class="container-site py-8 sm:py-12">
    <SiteBackButton to="/judge" label="Your competitions" />

    <div v-if="pending" class="mt-8 text-sm text-ink-faint">Loading…</div>

    <template v-else-if="data">
      <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-extrabold tracking-tight sm:text-3xl">{{ data.competition.name }}</h1>
          <p class="mt-1 text-ink-soft">Pick a team to rate. Each opens its own evaluation page.</p>
        </div>
        <NuxtLink :to="`/judge/${competitionId}/leaderboard`" class="btn-secondary !py-2.5 text-sm">
          <Icon name="lucide:bar-chart-3" /> Leaderboard
        </NuxtLink>
      </div>

      <p v-if="!data.competition.judgingOpen" class="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">
        <Icon name="lucide:lock" /> Judging is closed for this competition — you can review scores but not save changes.
      </p>

      <div v-if="!data.teams.length" class="card mt-8 p-10 text-center text-ink-soft">
        No confirmed teams yet for this competition.
      </div>

      <div v-else class="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <NuxtLink
          v-for="team in data.teams as Team[]"
          :key="team.id"
          :to="`/judge/${competitionId}/teams/${team.id}`"
          class="card card-hover flex flex-col p-6"
        >
          <p v-if="team.institution" class="text-xs font-bold uppercase tracking-wide text-brand-600">{{ team.institution }}</p>
          <h2 class="mt-1 truncate text-lg font-extrabold tracking-tight">{{ team.teamName || team.fullName }}</h2>

          <div class="mt-3">
            <span class="badge" :class="team.complete ? 'badge-green' : 'badge-gray'">
              {{ team.complete ? 'Complete' : 'Not scored yet' }}
            </span>
          </div>

          <span class="btn-primary mt-5 w-fit !py-2.5 text-sm">
            <Icon name="lucide:pencil" /> Evaluate
          </span>
        </NuxtLink>
      </div>
    </template>
  </section>
</template>
