<script setup lang="ts">
// Read-only standings table shared by the admin event workspace's Leaderboard
// tab. Reinforces "no admin edit of a judge's score" at the UI layer too —
// there is no input anywhere in this component, only a drill-down.
interface JudgeBreakdown {
  judgeId: number
  judgeName: string
  complete: boolean
  scores: Record<number, number>
}
interface TeamRow {
  registrationId: number
  teamName: string | null
  fullName: string
  institution: string
  rank: number | null
  averageScore: number | null
  judgesCompleted: number
  judgesTotal: number
  judgeBreakdown?: JudgeBreakdown[]
}
interface Board {
  criteria: { id: number; name: string; weight: number }[]
  judgesTotal: number
  teams: TeamRow[]
}

defineProps<{ board: Board | null; pending?: boolean }>()

const expanded = ref<number | null>(null)
</script>

<template>
  <div v-if="pending" class="p-6 text-sm text-ink-faint">Loading standings…</div>

  <AdminEmptyState
    v-else-if="!board?.teams.length"
    icon="lucide:trophy"
    title="No confirmed teams yet"
    body="Standings appear once teams are confirmed and judges start scoring."
  />

  <div v-else class="table-wrap">
    <table class="console-table min-w-[36rem]">
      <thead>
        <tr>
          <th scope="col">Rank</th>
          <th scope="col">Team</th>
          <th scope="col">Score</th>
          <th scope="col">Judging</th>
          <th scope="col" class="text-right">Detail</th>
        </tr>
      </thead>
      <tbody>
        <template v-for="t in board.teams" :key="t.registrationId">
          <tr>
            <td class="tabular-nums font-semibold text-ink">{{ t.rank ?? '—' }}</td>
            <td>
              <p class="font-semibold text-ink">{{ t.teamName || t.fullName }}</p>
              <p v-if="t.institution" class="text-xs text-ink-faint">{{ t.institution }}</p>
            </td>
            <td class="tabular-nums text-ink-soft">{{ t.averageScore ?? '—' }}</td>
            <td>
              <span class="status" :class="t.judgesCompleted === t.judgesTotal && t.judgesTotal > 0 ? 'status-ok' : 'status-warn'">
                {{ t.judgesCompleted }} of {{ t.judgesTotal }} judges
              </span>
            </td>
            <td class="text-right">
              <button
                v-if="t.judgeBreakdown?.length"
                type="button"
                class="btn-ghost !py-1.5 !text-xs"
                @click="expanded = expanded === t.registrationId ? null : t.registrationId"
              >
                <Icon name="lucide:chevron-down" :class="{ 'rotate-180': expanded === t.registrationId }" class="transition-transform" />
                Breakdown
              </button>
            </td>
          </tr>
          <tr v-if="expanded === t.registrationId && t.judgeBreakdown" class="bg-brand-50">
            <td colspan="5" class="!py-4">
              <div class="table-wrap">
                <table class="console-table min-w-[30rem]">
                  <thead>
                    <tr>
                      <th scope="col">Judge</th>
                      <th v-for="c in board.criteria" :key="c.id" scope="col">{{ c.name }}</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="j in t.judgeBreakdown" :key="j.judgeId">
                      <td class="text-ink-soft">{{ j.judgeName }}</td>
                      <td v-for="c in board.criteria" :key="c.id" class="tabular-nums text-ink-soft">{{ j.scores[c.id] ?? '—' }}</td>
                      <td>
                        <span class="status" :class="j.complete ? 'status-ok' : 'status-warn'">{{ j.complete ? 'Complete' : 'Partial' }}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>
