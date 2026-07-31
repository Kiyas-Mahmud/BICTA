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
const teamId = computed(() => Number(route.params.teamId))

const { data, refresh, pending } = await useFetch(`/api/judge/competitions/${competitionId}/teams`)

const teams = computed(() => (data.value?.teams ?? []) as Team[])
const currentIndex = computed(() => teams.value.findIndex((t) => t.id === teamId.value))
const currentTeam = computed(() => teams.value[currentIndex.value] as Team | undefined)

// Local editable draft: { [criterionId]: { value, note } }
const draft = reactive<Record<number, { value: number; note: string }>>({})
const dirty = ref(false)
const saving = ref(false)
const error = ref('')

function loadDraft(team: Team) {
  for (const key of Object.keys(draft)) delete draft[Number(key)]
  for (const c of data.value?.criteria ?? []) {
    draft[c.id] = { value: team.scores[c.id]?.value ?? 0, note: team.scores[c.id]?.note ?? '' }
  }
  dirty.value = false
}

watch(currentTeam, (team) => { if (team) loadDraft(team) }, { immediate: true })

function markDirty() {
  dirty.value = true
}

async function save() {
  if (!currentTeam.value) return
  saving.value = true
  error.value = ''
  try {
    await $fetch(`/api/judge/competitions/${competitionId}/teams/${currentTeam.value.id}/scores`, {
      method: 'PUT',
      body: Object.entries(draft).map(([criterionId, v]) => ({
        criterionId: Number(criterionId),
        value: v.value,
        note: v.note || null,
      })),
    })
    dirty.value = false
    await refresh()
  } catch (e: any) {
    error.value = e?.data?.statusMessage ?? 'Could not save. Try again.'
  } finally {
    saving.value = false
  }
}

useSeoMeta({ title: () => currentTeam.value?.teamName || currentTeam.value?.fullName || 'Evaluate team', robots: 'noindex' })
</script>

<template>
  <section class="container-site py-8 sm:py-12">
    <SiteBackButton :to="`/judge/${competitionId}`" label="Team list" />

    <div v-if="pending" class="mt-8 text-sm text-ink-faint">Loading…</div>

    <div v-else-if="!currentTeam" class="card mt-8 p-10 text-center text-ink-soft">
      Team not found, or you're not assigned to this competition.
    </div>

    <template v-else>
      <p class="mt-4 text-sm font-semibold text-ink-soft">Team {{ currentIndex + 1 }} of {{ teams.length }}</p>

      <div class="card mt-2 p-5 sm:p-7">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0">
            <p v-if="currentTeam.institution" class="text-xs font-bold uppercase tracking-wide text-brand-600">{{ currentTeam.institution }}</p>
            <h1 class="mt-1 truncate text-xl font-extrabold text-ink sm:text-2xl">{{ currentTeam.teamName || currentTeam.fullName }}</h1>
          </div>
          <span class="badge shrink-0" :class="currentTeam.complete ? 'badge-green' : 'badge-gray'">
            {{ currentTeam.complete ? 'Complete' : 'Not scored yet' }}
          </span>
        </div>

        <p v-if="data && !data.competition.judgingOpen" class="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">
          <Icon name="lucide:lock" /> Judging is closed for this competition — you can review scores but not save changes.
        </p>

        <div class="mt-6 space-y-6">
          <div v-for="c in (data?.criteria ?? []) as Criterion[]" :key="c.id">
            <div class="flex items-center justify-between gap-3">
              <p class="font-bold text-ink">
                <Icon :name="c.icon || 'lucide:check-circle-2'" class="mr-1 text-brand-600" /> {{ c.name }}
                <span class="ml-1 text-xs font-semibold text-ink-faint">({{ c.weight }}% weight)</span>
              </p>
            </div>
            <p v-if="c.description" class="mt-0.5 text-sm text-ink-soft">{{ c.description }}</p>

            <div class="mt-2 grid grid-cols-5 gap-1.5 sm:flex sm:flex-wrap" role="group" :aria-label="`${c.name} rating`">
              <button
                v-for="n in 10"
                :key="n"
                type="button"
                class="flex h-10 w-full items-center justify-center rounded-lg text-sm font-bold transition-colors sm:h-9 sm:w-9"
                :class="draft[c.id]?.value === n ? 'bg-brand-600 text-white' : 'bg-mist-1 text-ink-soft hover:bg-mist-2'"
                :disabled="!data?.competition.judgingOpen"
                :aria-pressed="draft[c.id]?.value === n"
                @click="draft[c.id]!.value = n; markDirty()"
              >
                {{ n }}
              </button>
            </div>

            <textarea
              v-model="draft[c.id]!.note"
              class="field mt-2 w-full text-sm"
              rows="2"
              maxlength="1000"
              placeholder="Optional note"
              :disabled="!data?.competition.judgingOpen"
              @input="markDirty()"
            />
          </div>
        </div>

        <p v-if="error" class="form-error mt-4">{{ error }}</p>

        <button
          type="button"
          class="btn-primary mt-6 w-full !py-3 sm:w-auto"
          :disabled="!dirty || saving || !data?.competition.judgingOpen"
          @click="save"
        >
          <Icon :name="saving ? 'lucide:loader-2' : 'lucide:check'" :class="{ 'animate-spin': saving }" />
          {{ saving ? 'Saving…' : 'Save this team' }}
        </button>
      </div>
    </template>
  </section>
</template>
