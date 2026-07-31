<script setup lang="ts">
// No toast host is mounted in the judge layout (mirrors the participant
// portal, which also uses inline per-card feedback rather than useToast()).
definePageMeta({ layout: 'judge', middleware: 'judge' })

interface Criterion { id: number; name: string; description: string; weight: number; icon: string | null }
interface TeamScore { value: number; note: string | null }
interface Team {
  id: number
  teamName: string | null
  fullName: string
  institution: string
  scores: Record<number, TeamScore>
  complete: boolean
}

const route = useRoute()
const competitionId = Number(route.params.competitionId)

const { data, refresh, pending } = await useFetch(`/api/judge/competitions/${competitionId}/teams`)

// Local editable draft per team: { [teamId]: { [criterionId]: { value, note } } }
const drafts = reactive<Record<number, Record<number, { value: number; note: string }>>>({})
const dirty = reactive<Record<number, boolean>>({})
const saving = reactive<Record<number, boolean>>({})
const errors = reactive<Record<number, string>>({})
const expanded = ref<number | null>(null)

function draftFor(team: Team) {
  if (!drafts[team.id]) {
    const d: Record<number, { value: number; note: string }> = {}
    for (const c of data.value?.criteria ?? []) {
      d[c.id] = { value: team.scores[c.id]?.value ?? 0, note: team.scores[c.id]?.note ?? '' }
    }
    drafts[team.id] = d
  }
  return drafts[team.id]
}

function toggle(team: Team) {
  expanded.value = expanded.value === team.id ? null : team.id
  if (expanded.value === team.id) draftFor(team)
}

function markDirty(teamId: number) {
  dirty[teamId] = true
}

async function saveTeam(team: Team) {
  const draft = draftFor(team)
  saving[team.id] = true
  errors[team.id] = ''
  try {
    await $fetch(`/api/judge/competitions/${competitionId}/teams/${team.id}/scores`, {
      method: 'PUT',
      body: Object.entries(draft).map(([criterionId, v]) => ({
        criterionId: Number(criterionId),
        value: v.value,
        note: v.note || null,
      })),
    })
    dirty[team.id] = false
    await refresh()
  } catch (e: any) {
    errors[team.id] = e?.data?.statusMessage ?? 'Could not save. Try again.'
  } finally {
    saving[team.id] = false
  }
}

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
          <p class="mt-1 text-ink-soft">Rate each criterion 1–10. Save a team once you've reviewed all its ratings.</p>
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

      <div v-else class="mt-6 space-y-3">
        <div v-for="team in data.teams as Team[]" :key="team.id" class="card overflow-hidden">
          <button type="button" class="flex w-full items-center justify-between gap-3 p-5 text-left" @click="toggle(team)">
            <div class="min-w-0">
              <p class="truncate font-extrabold text-ink">{{ team.teamName || team.fullName }}</p>
              <p v-if="team.institution" class="truncate text-xs text-ink-faint">{{ team.institution }}</p>
            </div>
            <div class="flex shrink-0 items-center gap-2">
              <span class="badge" :class="team.complete ? 'badge-green' : 'badge-gray'">
                {{ team.complete ? 'Complete' : 'Not scored yet' }}
              </span>
              <Icon name="lucide:chevron-down" class="transition-transform" :class="{ 'rotate-180': expanded === team.id }" />
            </div>
          </button>

          <div v-if="expanded === team.id" class="border-t border-line p-5">
            <div class="space-y-5">
              <div v-for="c in data.criteria as Criterion[]" :key="c.id">
                <div class="flex items-center justify-between gap-3">
                  <p class="font-bold text-ink">
                    <Icon :name="c.icon || 'lucide:check-circle-2'" class="mr-1 text-brand-600" /> {{ c.name }}
                    <span class="ml-1 text-xs font-semibold text-ink-faint">({{ c.weight }}% weight)</span>
                  </p>
                </div>
                <p v-if="c.description" class="mt-0.5 text-sm text-ink-soft">{{ c.description }}</p>

                <div class="mt-2 flex flex-wrap gap-1.5" role="group" :aria-label="`${c.name} rating`">
                  <button
                    v-for="n in 10"
                    :key="n"
                    type="button"
                    class="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold transition-colors"
                    :class="draftFor(team)[c.id]?.value === n ? 'bg-brand-600 text-white' : 'bg-mist-1 text-ink-soft hover:bg-mist-2'"
                    :disabled="!data.competition.judgingOpen"
                    :aria-pressed="draftFor(team)[c.id]?.value === n"
                    @click="draftFor(team)[c.id]!.value = n; markDirty(team.id)"
                  >
                    {{ n }}
                  </button>
                </div>

                <textarea
                  v-model="draftFor(team)[c.id]!.note"
                  class="field mt-2 w-full text-sm"
                  rows="2"
                  maxlength="1000"
                  placeholder="Optional note"
                  :disabled="!data.competition.judgingOpen"
                  @input="markDirty(team.id)"
                />
              </div>
            </div>

            <p v-if="errors[team.id]" class="form-error mt-4">{{ errors[team.id] }}</p>

            <button
              type="button"
              class="btn-primary mt-5 !py-2.5"
              :disabled="!dirty[team.id] || saving[team.id] || !data.competition.judgingOpen"
              @click="saveTeam(team)"
            >
              <Icon :name="saving[team.id] ? 'lucide:loader-2' : 'lucide:check'" :class="{ 'animate-spin': saving[team.id] }" />
              {{ saving[team.id] ? 'Saving…' : 'Save this team' }}
            </button>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>
