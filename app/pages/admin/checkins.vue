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
</script>

<template>
  <div v-if="data">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold tracking-tight">Collection Report</h1>
      <a href="/api/admin/checkins/export" class="btn-ghost" download><Icon name="lucide:download" /> Export CSV</a>
    </div>
    <p class="mt-1 text-sm text-ink-soft">Who has collected what at each check-in point for the current event.</p>

    <!-- totals -->
    <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div v-for="cp in data.checkpoints" :key="cp.id" class="admin-card p-5">
        <p class="text-sm text-ink-soft">{{ cp.name }}</p>
        <p class="mt-1 text-3xl font-bold">{{ totals[cp.id] ?? 0 }}<span class="text-base font-medium text-ink-faint"> / {{ data.participants.length }}</span></p>
      </div>
      <div v-if="!data.checkpoints.length" class="admin-card p-5 text-sm text-ink-faint sm:col-span-2 lg:col-span-4">
        No checkpoints yet. Add them under <NuxtLink to="/admin/checkpoints" class="text-accent hover:underline">Check-in Points</NuxtLink>.
      </div>
    </div>

    <!-- table -->
    <div class="mt-6 overflow-x-auto rounded-xl border border-line bg-white">
      <table class="w-full text-left text-sm">
        <thead class="border-b border-line bg-neutral-50 text-xs uppercase text-ink-soft">
          <tr>
            <th class="px-4 py-3">Participant</th>
            <th class="px-4 py-3">Team</th>
            <th v-for="cp in data.checkpoints" :key="cp.id" class="px-4 py-3 text-center">{{ cp.name }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in data.participants" :key="p.accountId" class="border-b border-line transition-colors last:border-0 hover:bg-neutral-50">
            <td class="px-4 py-3">
              <p class="font-medium">{{ p.fullName }} <span v-if="p.role === 'leader'" class="text-xs text-ink-faint">(leader)</span></p>
              <p class="text-xs text-ink-faint">{{ p.email }}</p>
            </td>
            <td class="px-4 py-3 text-ink-soft">{{ p.teamName || p.competition }}</td>
            <td v-for="cp in data.checkpoints" :key="cp.id" class="px-4 py-3 text-center">
              <Icon v-if="p.collected.includes(cp.id)" name="lucide:check" class="text-green-600" />
              <span v-else class="text-ink-faint">—</span>
            </td>
          </tr>
          <tr v-if="!data.participants.length">
            <td :colspan="2 + data.checkpoints.length" class="px-4 py-10 text-center text-ink-faint">No participants yet.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
