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

// Client-side narrowing: find one person fast at a busy booth.
const search = ref('')
const onlyMissing = ref(false)
const visible = computed(() => {
  const q = search.value.trim().toLowerCase()
  const cps = data.value?.checkpoints ?? []
  return (data.value?.participants ?? []).filter((p) => {
    const matches = !q || [p.fullName, p.email, p.teamName, p.competition].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
    const missing = !onlyMissing.value || p.collected.length < cps.length
    return matches && missing
  })
})
</script>

<template>
  <div v-if="data" class="space-y-6">
    <AdminPageHeader
      title="Collection Report"
      subtitle="Who has collected what at each check-in point for the current event."
      icon="lucide:package-check"
    >
      <template #actions>
        <a href="/api/admin/checkins/export" class="btn-secondary !py-2.5" download>
          <Icon name="lucide:download" /> Export CSV
        </a>
      </template>
    </AdminPageHeader>

    <!-- per-checkpoint progress -->
    <div v-if="data.checkpoints.length" class="fade-up stagger-1 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div v-for="cp in data.checkpoints" :key="cp.id" class="surface p-5">
        <div class="flex items-center justify-between gap-3">
          <p class="flex min-w-0 items-center gap-2 text-sm font-bold text-ink">
            <Icon name="lucide:map-pin" class="shrink-0 text-brand-700" />
            <span class="truncate">{{ cp.name }}</span>
          </p>
          <span class="status status-brand">{{ pct(cp.id) }}%</span>
        </div>
        <p class="mt-3 text-3xl font-extrabold tabular-nums leading-none text-ink">
          {{ totals[cp.id] ?? 0 }}<span class="text-base font-semibold text-ink-faint"> / {{ totalPeople }}</span>
        </p>
        <div class="mt-3 h-2 w-full overflow-hidden rounded-full bg-mist-1" role="progressbar" :aria-valuenow="pct(cp.id)" aria-valuemin="0" aria-valuemax="100" :aria-label="`${cp.name} collection progress`">
          <div class="meter-fill h-full rounded-full bg-gradient-brand" :style="{ width: `${pct(cp.id)}%` }" />
        </div>
      </div>
    </div>

    <AdminPanel v-else icon="lucide:map-pin" title="No check-in points yet" class="fade-up stagger-1">
      <p class="text-sm text-ink-soft">
        Add Welcome Kit, Lunch or Snacks under
        <NuxtLink to="/admin/checkpoints" class="font-bold text-brand-700 hover:text-brand-800">Check-in Points</NuxtLink>,
        then volunteers can scan participant QR codes on the day.
      </p>
    </AdminPanel>

    <!-- filters -->
    <div v-if="data.participants.length" class="toolbar fade-up stagger-2">
      <div class="relative min-w-[13rem] flex-1">
        <Icon name="lucide:search" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
        <label class="sr-only" for="checkin-search">Search participants</label>
        <input id="checkin-search" v-model="search" type="search" class="input !pl-9" placeholder="Search participant, team or competition" />
      </div>
      <label class="flex min-h-[2.6rem] cursor-pointer items-center gap-2.5 rounded-xl border border-line px-3.5 text-sm font-semibold text-ink-soft transition-colors hover:border-brand-300 hover:text-ink">
        <span class="relative inline-flex">
          <input v-model="onlyMissing" type="checkbox" class="peer sr-only" />
          <span class="switch-track" />
          <span class="switch-knob" />
        </span>
        Not fully collected
      </label>
      <span class="ml-auto text-xs font-semibold text-ink-faint">{{ visible.length }} of {{ totalPeople }} people</span>
    </div>

    <!-- matrix -->
    <section class="surface fade-up stagger-3 overflow-hidden">
      <!-- mobile: one card per person, checkpoints as chips -->
      <ul class="divide-y divide-line lg:hidden">
        <li v-for="p in visible" :key="p.accountId" class="flex items-start gap-3 p-4">
          <AdminAvatar :name="p.fullName" />
          <div class="min-w-0 flex-1">
            <p class="flex items-center gap-2 truncate font-bold text-ink">
              {{ p.fullName }}
              <span v-if="p.role === 'leader'" class="status status-brand">Leader</span>
            </p>
            <p class="truncate text-xs text-ink-faint">{{ p.email }}</p>
            <p class="mt-0.5 truncate text-xs text-ink-soft">{{ p.teamName || p.competition }}</p>
            <ul class="mt-2.5 flex flex-wrap gap-1.5">
              <li
                v-for="cp in data.checkpoints"
                :key="cp.id"
                class="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold"
                :class="p.collected.includes(cp.id) ? 'bg-green-50 text-green-700' : 'bg-mist-1 text-ink-faint'"
              >
                <Icon :name="p.collected.includes(cp.id) ? 'lucide:check' : 'lucide:minus'" class="text-sm" />
                {{ cp.name }}
              </li>
            </ul>
          </div>
        </li>
        <li v-if="!visible.length">
          <AdminEmptyState icon="lucide:users" :title="search || onlyMissing ? 'No matching participants' : 'No participants yet'" body="Participants appear once registrations create their accounts." />
        </li>
      </ul>

      <!-- desktop: participant × checkpoint matrix -->
      <div class="table-wrap hidden lg:block">
        <table class="console-table">
          <thead>
            <tr>
              <th scope="col">Participant</th>
              <th scope="col">Team</th>
              <th v-for="cp in data.checkpoints" :key="cp.id" scope="col" class="!text-center">{{ cp.name }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in visible" :key="p.accountId">
              <td>
                <div class="flex items-center gap-3">
                  <AdminAvatar :name="p.fullName" />
                  <div class="min-w-0">
                    <p class="flex items-center gap-2 truncate font-semibold text-ink">
                      {{ p.fullName }}
                      <span v-if="p.role === 'leader'" class="status status-brand">Leader</span>
                    </p>
                    <p class="truncate text-xs text-ink-faint">{{ p.email }}</p>
                  </div>
                </div>
              </td>
              <td class="text-ink-soft">{{ p.teamName || p.competition }}</td>
              <td v-for="cp in data.checkpoints" :key="cp.id" class="text-center">
                <span
                  class="inline-flex h-7 w-7 items-center justify-center rounded-full"
                  :class="p.collected.includes(cp.id) ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-100' : 'bg-mist-1 text-ink-faint'"
                  :title="`${p.fullName} — ${cp.name}: ${p.collected.includes(cp.id) ? 'collected' : 'not collected'}`"
                >
                  <Icon :name="p.collected.includes(cp.id) ? 'lucide:check' : 'lucide:minus'" class="text-sm" />
                  <span class="sr-only">{{ p.collected.includes(cp.id) ? 'Collected' : 'Not collected' }}</span>
                </span>
              </td>
            </tr>
            <tr v-if="!visible.length">
              <td :colspan="2 + data.checkpoints.length" class="!p-0">
                <AdminEmptyState
                  icon="lucide:users"
                  :title="search || onlyMissing ? 'No matching participants' : 'No participants yet'"
                  body="Participants appear here once registrations create their accounts."
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
