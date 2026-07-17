<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const { data: stats } = await useFetch('/api/admin/stats', { key: 'admin-stats' })

const money = (n: number) => new Intl.NumberFormat('en-US').format(n || 0)

// 7-day-over-7-day registration momentum from the 14-point series.
const regDelta = computed(() => {
  const s = stats.value?.series ?? []
  if (s.length < 14) return null
  const last = s.slice(7).reduce((a, d) => a + d.value, 0)
  const prev = s.slice(0, 7).reduce((a, d) => a + d.value, 0)
  return last - prev
})

const statusSegments = computed(() => [
  { label: 'Confirmed', value: stats.value?.byStatus.confirmed ?? 0, color: '#5e6f54' },
  { label: 'Pending', value: stats.value?.byStatus.pending ?? 0, color: '#d9a441' },
  { label: 'Rejected', value: stats.value?.byStatus.rejected ?? 0, color: '#c0685f' },
])

const topMax = computed(() => Math.max(1, ...(stats.value?.topComps ?? []).map((c: any) => c.n)))

// Event-day collection progress: collected vs the full grid (people × points).
const collectionMax = computed(() => (stats.value?.participants ?? 0) * (stats.value?.checkpoints ?? 0))
const collectionPct = computed(() =>
  collectionMax.value ? Math.round(((stats.value?.checkins ?? 0) / collectionMax.value) * 100) : 0,
)

function initials(name: string) {
  return (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
}
function ago(iso: string) {
  const d = new Date(iso + 'Z').getTime()
  const s = Math.floor((Date.now() - d) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}
const statusPill: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  confirmed: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-600',
}
</script>

<template>
  <div class="space-y-6">
    <!-- current event banner -->
    <div
      class="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-gradient-brand p-5 text-white shadow-soft"
    >
      <div class="flex items-center gap-3">
        <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
          <Icon name="lucide:calendar-check" class="text-xl" />
        </span>
        <div>
          <p class="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-white/70">Current event</p>
          <p v-if="stats?.currentEvent" class="text-lg font-bold">
            {{ stats.currentEvent.title }} <span class="font-medium text-white/70">· {{ stats.currentEvent.year }}</span>
          </p>
          <p v-else class="text-lg font-bold">No current event set</p>
        </div>
      </div>
      <NuxtLink to="/admin/events" class="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-sm font-bold text-brand-800 transition-transform hover:-translate-y-0.5">
        <Icon name="lucide:settings-2" /> Manage event
      </NuxtLink>
    </div>

    <!-- primary metrics -->
    <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <AdminStatCard label="Prize pool" :value="money(stats?.prizePool ?? 0)" icon="lucide:banknote" tone="brand" caption="across all prizes" />
      <AdminStatCard label="Participants" :value="stats?.participants ?? 0" icon="lucide:users" tone="violet" :caption="`${stats?.activeParticipants ?? 0} active accounts`" />
      <AdminStatCard label="Competitions" :value="stats?.competitions ?? 0" icon="lucide:trophy" tone="green" :caption="`${stats?.events ?? 0} events`" to="/admin/events" />
      <AdminStatCard label="Registrations" :value="stats?.registrations ?? 0" icon="lucide:clipboard-list" tone="amber" :caption="`${stats?.pendingRegistrations ?? 0} pending review`" :delta="regDelta" to="/admin/registrations" />
    </div>

    <!-- trend + status -->
    <div class="grid gap-4 lg:grid-cols-3">
      <div class="rounded-2xl border border-line bg-white p-5 shadow-soft lg:col-span-2">
        <div class="mb-4 flex items-center justify-between">
          <div>
            <h2 class="text-sm font-bold text-ink">Registration trend</h2>
            <p class="text-xs text-ink-faint">Daily sign-ups, last 14 days</p>
          </div>
          <span class="rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700">Live</span>
        </div>
        <AdminMiniBarChart :data="stats?.series ?? []" />
      </div>

      <div class="rounded-2xl border border-line bg-white p-5 shadow-soft">
        <h2 class="mb-4 text-sm font-bold text-ink">Registration status</h2>
        <AdminDonutStat :segments="statusSegments" :center-value="stats?.registrations ?? 0" center-label="total" />
      </div>
    </div>

    <!-- top competitions + collection -->
    <div class="grid gap-4 lg:grid-cols-3">
      <div class="rounded-2xl border border-line bg-white p-5 shadow-soft lg:col-span-2">
        <h2 class="mb-4 text-sm font-bold text-ink">Top competitions</h2>
        <div v-if="stats?.topComps?.length" class="space-y-3.5">
          <div v-for="(c, i) in stats.topComps" :key="i">
            <div class="mb-1 flex items-center justify-between text-sm">
              <span class="truncate font-medium text-ink">{{ c.name }}</span>
              <span class="ml-3 shrink-0 font-bold text-ink-soft">{{ c.n }}</span>
            </div>
            <div class="h-2.5 w-full overflow-hidden rounded-full bg-mist-1">
              <div class="h-full rounded-full bg-gradient-brand transition-all duration-700" :style="{ width: `${Math.max(4, (c.n / topMax) * 100)}%` }" />
            </div>
          </div>
        </div>
        <p v-else class="py-8 text-center text-sm text-ink-faint">No competitions yet.</p>
      </div>

      <div class="flex flex-col rounded-2xl border border-line bg-white p-5 shadow-soft">
        <h2 class="text-sm font-bold text-ink">Event-day collection</h2>
        <p class="text-xs text-ink-faint">Items handed out at booths</p>
        <div class="flex flex-1 flex-col items-center justify-center py-4">
          <div class="relative h-28 w-28">
            <svg viewBox="0 0 36 36" class="h-full w-full -rotate-90">
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#eef1f3" stroke-width="3.6" />
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#5e6f54" stroke-width="3.6" stroke-linecap="round" :stroke-dasharray="`${collectionPct} ${100 - collectionPct}`" stroke-dashoffset="25" />
            </svg>
            <div class="absolute inset-0 flex flex-col items-center justify-center">
              <span class="text-2xl font-extrabold text-ink">{{ collectionPct }}%</span>
            </div>
          </div>
          <p class="mt-3 text-center text-sm text-ink-soft">
            <span class="font-bold text-ink">{{ stats?.checkins ?? 0 }}</span> collected
            <span class="text-ink-faint">· {{ stats?.checkpoints ?? 0 }} checkpoints</span>
          </p>
        </div>
      </div>
    </div>

    <!-- recent registrations -->
    <div class="overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
      <div class="flex items-center justify-between px-5 py-4">
        <div>
          <h2 class="text-sm font-bold text-ink">Recent registrations</h2>
          <p class="text-xs text-ink-faint">Latest people to sign up</p>
        </div>
        <NuxtLink to="/admin/registrations" class="inline-flex items-center gap-1 text-xs font-bold text-brand-700 hover:text-brand-800">
          View all <Icon name="lucide:arrow-right" />
        </NuxtLink>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[540px] text-left text-sm">
          <thead>
            <tr class="border-y border-line bg-mist-1 text-[0.68rem] uppercase tracking-wider text-ink-faint">
              <th class="px-5 py-2.5 font-bold">Participant</th>
              <th class="px-5 py-2.5 font-bold">Competition</th>
              <th class="px-5 py-2.5 font-bold">Status</th>
              <th class="px-5 py-2.5 text-right font-bold">When</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in stats?.recent ?? []" :key="r.id" class="border-b border-line transition-colors last:border-0 hover:bg-mist-1">
              <td class="px-5 py-3">
                <div class="flex items-center gap-3">
                  <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-800">{{ initials(r.fullName) }}</span>
                  <div class="min-w-0">
                    <p class="truncate font-semibold text-ink">{{ r.fullName }}</p>
                    <p class="truncate text-xs text-ink-faint">{{ r.email }}</p>
                  </div>
                </div>
              </td>
              <td class="px-5 py-3 text-ink-soft">{{ r.competitionName ?? '—' }}</td>
              <td class="px-5 py-3">
                <span class="rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize" :class="statusPill[r.status]">{{ r.status }}</span>
              </td>
              <td class="px-5 py-3 text-right text-ink-faint">{{ ago(r.createdAt) }}</td>
            </tr>
            <tr v-if="!stats?.recent?.length">
              <td colspan="4" class="px-5 py-10 text-center text-ink-faint">No registrations yet.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
