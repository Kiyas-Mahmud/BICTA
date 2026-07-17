<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

interface Report {
  checkpoints: { id: number; name: string }[]
  participants: {
    accountId: number
    fullName: string
    email: string
    role: string
    teamName: string | null
    competition: string
    collected: number[]
  }[]
}
const { data } = await useFetch<Report>('/api/admin/checkins')

const totals = computed(() => {
  const map: Record<number, number> = {}
  for (const cp of data.value?.checkpoints ?? []) map[cp.id] = 0
  for (const p of data.value?.participants ?? []) for (const id of p.collected) map[id] = (map[id] ?? 0) + 1
  return map
})
const totalPeople = computed(() => data.value?.participants.length ?? 0)
function pct(id: number) {
  return totalPeople.value ? Math.round(((totals.value[id] ?? 0) / totalPeople.value) * 100) : 0
}
function initials(name: string) {
  return (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
}
</script>

<template>
  <div v-if="data">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-ink">Collection Report</h1>
        <p class="mt-0.5 text-sm text-ink-soft">Who has collected what at each check-in point for the current event.</p>
      </div>
      <a href="/api/admin/checkins/export" class="btn-secondary !py-2.5" download><Icon name="lucide:download" /> Export CSV</a>
    </div>

    <!-- totals -->
    <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div v-for="cp in data.checkpoints" :key="cp.id" class="rounded-2xl border border-line bg-white p-5 shadow-soft">
        <div class="flex items-center justify-between">
          <p class="text-sm font-semibold text-ink">{{ cp.name }}</p>
          <span class="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-700">{{ pct(cp.id) }}%</span>
        </div>
        <p class="mt-2 text-3xl font-extrabold text-ink">{{ totals[cp.id] ?? 0 }}<span class="text-base font-medium text-ink-faint"> / {{ totalPeople }}</span></p>
        <div class="mt-3 h-2 w-full overflow-hidden rounded-full bg-mist-1">
          <div class="h-full rounded-full bg-gradient-brand transition-all duration-700" :style="{ width: `${pct(cp.id)}%` }" />
        </div>
      </div>
      <div v-if="!data.checkpoints.length" class="rounded-2xl border border-line bg-white p-5 text-sm text-ink-faint shadow-soft sm:col-span-2 lg:col-span-4">
        No checkpoints yet. Add them under <NuxtLink to="/admin/checkpoints" class="font-semibold text-brand-700 hover:underline">Check-in Points</NuxtLink>.
      </div>
    </div>

    <!-- table -->
    <div class="mt-6 overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr class="border-b border-line bg-mist-1 text-[0.68rem] uppercase tracking-wider text-ink-faint">
              <th class="px-5 py-3 font-bold">Participant</th>
              <th class="px-5 py-3 font-bold">Team</th>
              <th v-for="cp in data.checkpoints" :key="cp.id" class="px-4 py-3 text-center font-bold">{{ cp.name }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in data.participants" :key="p.accountId" class="border-b border-line transition-colors last:border-0 hover:bg-mist-1">
              <td class="px-5 py-3">
                <div class="flex items-center gap-3">
                  <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-800">{{ initials(p.fullName) }}</span>
                  <div class="min-w-0">
                    <p class="truncate font-semibold text-ink">
                      {{ p.fullName }}
                      <span v-if="p.role === 'leader'" class="ml-1 rounded bg-brand-50 px-1.5 py-0.5 text-[0.6rem] font-bold uppercase text-brand-700">Leader</span>
                    </p>
                    <p class="truncate text-xs text-ink-faint">{{ p.email }}</p>
                  </div>
                </div>
              </td>
              <td class="px-5 py-3 text-ink-soft">{{ p.teamName || p.competition }}</td>
              <td v-for="cp in data.checkpoints" :key="cp.id" class="px-4 py-3 text-center">
                <span v-if="p.collected.includes(cp.id)" class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-50 text-green-700">
                  <Icon name="lucide:check" class="text-sm" />
                </span>
                <span v-else class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-mist-1 text-ink-faint">
                  <Icon name="lucide:minus" class="text-sm" />
                </span>
              </td>
            </tr>
            <tr v-if="!data.participants.length">
              <td :colspan="2 + data.checkpoints.length" class="px-5 py-12 text-center text-ink-faint">No participants yet.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
