<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const { user } = useUserSession()
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

const greeting = computed(() => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
})
const firstName = computed(() => ((user.value as any)?.name || 'there').split(' ')[0])

// Work waiting on the admin — only rendered when there is something to do.
const attention = computed(() => {
  const items: { icon: string; label: string; count: number; to: string; tone: string }[] = []
  if (stats.value?.pendingRegistrations)
    items.push({ icon: 'lucide:clipboard-check', label: 'registrations awaiting review', count: stats.value.pendingRegistrations, to: '/admin/registrations', tone: 'amber' })
  if (stats.value?.unreadMessages)
    items.push({ icon: 'lucide:inbox', label: 'unread contact messages', count: stats.value.unreadMessages, to: '/admin/messages', tone: 'brand' })
  if (!stats.value?.currentEvent)
    items.push({ icon: 'lucide:calendar-x', label: 'no current event is set', count: 0, to: '/admin/events', tone: 'red' })
  return items
})
const attentionTone: Record<string, string> = {
  amber: 'bg-amber-50 text-amber-700 ring-amber-100',
  brand: 'bg-brand-50 text-brand-800 ring-brand-100',
  red: 'bg-red-50 text-red-600 ring-red-100',
}

// Secondary counts: people and partners behind the event.
const roster = computed(() => [
  { label: 'Volunteers', value: stats.value?.volunteers ?? 0, icon: 'lucide:scan-line', to: '/admin/volunteers' },
  { label: 'Judges', value: stats.value?.judges ?? 0, icon: 'lucide:gavel', to: '/admin/people' },
  { label: 'Speakers', value: stats.value?.speakers ?? 0, icon: 'lucide:mic', to: '/admin/people' },
  { label: 'Sponsors', value: stats.value?.sponsors ?? 0, icon: 'lucide:handshake', to: '/admin/sponsors' },
  { label: 'Subscribers', value: stats.value?.subscribers ?? 0, icon: 'lucide:mail', to: '/admin/newsletter' },
  { label: 'Admins', value: stats.value?.admins ?? 0, icon: 'lucide:shield-check', to: '/admin/account' },
])

const shortcuts = [
  { to: '/admin/events/new', icon: 'lucide:calendar-plus', label: 'New event' },
  { to: '/admin/news/new', icon: 'lucide:pen-line', label: 'Write article' },
  { to: '/admin/checkpoints', icon: 'lucide:map-pin', label: 'Check-in points' },
  { to: '/admin/settings', icon: 'lucide:sliders-horizontal', label: 'Site settings' },
]
</script>

<template>
  <div class="space-y-6">
    <!-- greeting + current event -->
    <section class="fade-up relative overflow-hidden rounded-2xl bg-gradient-brand p-6 text-white shadow-soft sm:p-7">
      <span class="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
      <div class="relative flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div class="min-w-0">
          <p class="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-white/70">{{ greeting }}, {{ firstName }}</p>
          <h1 class="mt-2 truncate text-2xl font-extrabold tracking-[-0.02em] sm:text-3xl">
            {{ stats?.currentEvent?.title ?? 'No current event set' }}
          </h1>
          <div class="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span v-if="stats?.currentEvent" class="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 font-bold">
              <Icon name="lucide:calendar-check" class="text-sm" /> {{ stats.currentEvent.year }} edition
            </span>
            <span class="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 font-semibold text-white/90">
              <Icon name="lucide:trophy" class="text-sm" /> {{ stats?.competitions ?? 0 }} competitions
            </span>
            <span class="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 font-semibold text-white/90">
              <Icon name="lucide:users" class="text-sm" /> {{ stats?.participants ?? 0 }} participants
            </span>
          </div>
        </div>
        <div class="flex flex-wrap gap-2.5">
          <NuxtLink
            to="/admin/events"
            class="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-brand-800 transition-transform duration-200 hover:-translate-y-0.5"
          >
            <Icon name="lucide:settings-2" /> Manage event
          </NuxtLink>
          <NuxtLink
            to="/admin/registrations"
            class="inline-flex items-center gap-1.5 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition-colors duration-200 hover:bg-white/20"
          >
            <Icon name="lucide:clipboard-list" /> Registrations
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- needs attention -->
    <section v-if="attention.length" class="fade-up stagger-1 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <NuxtLink
        v-for="a in attention"
        :key="a.to"
        :to="a.to"
        class="surface group flex items-center gap-3.5 px-4 py-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lift"
      >
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset" :class="attentionTone[a.tone]">
          <Icon :name="a.icon" class="text-lg" />
        </span>
        <p class="min-w-0 flex-1 text-sm text-ink-soft">
          <span v-if="a.count" class="font-extrabold text-ink">{{ a.count }}</span>
          {{ a.label }}
        </p>
        <Icon name="lucide:arrow-right" class="shrink-0 text-ink-faint transition-transform duration-200 group-hover:translate-x-0.5" />
      </NuxtLink>
    </section>

    <!-- primary metrics -->
    <section class="fade-up stagger-2 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <AdminStatCard label="Prize pool" :value="money(stats?.prizePool ?? 0)" icon="lucide:banknote" tone="brand" caption="across all prizes" />
      <AdminStatCard label="Participants" :value="stats?.participants ?? 0" icon="lucide:users" tone="violet" :caption="`${stats?.activeParticipants ?? 0} active accounts`" />
      <AdminStatCard label="Competitions" :value="stats?.competitions ?? 0" icon="lucide:trophy" tone="green" :caption="`${stats?.events ?? 0} events`" to="/admin/events" />
      <AdminStatCard label="Registrations" :value="stats?.registrations ?? 0" icon="lucide:clipboard-list" tone="amber" :caption="`${stats?.pendingRegistrations ?? 0} pending review`" :delta="regDelta" to="/admin/registrations" />
    </section>

    <!-- roster: people and partners -->
    <section class="fade-up stagger-2 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      <NuxtLink
        v-for="r in roster"
        :key="r.label"
        :to="r.to"
        class="surface group flex items-center gap-3 p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lift"
      >
        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-mist-1 text-ink-soft ring-1 ring-inset ring-line transition-colors group-hover:bg-brand-50 group-hover:text-brand-700">
          <Icon :name="r.icon" />
        </span>
        <span class="min-w-0">
          <span class="block text-lg font-extrabold leading-none tabular-nums text-ink">{{ r.value }}</span>
          <span class="mt-1 block truncate text-[0.7rem] font-semibold text-ink-faint">{{ r.label }}</span>
        </span>
      </NuxtLink>
    </section>

    <!-- trend + status -->
    <section class="fade-up stagger-3 grid gap-4 xl:grid-cols-3">
      <AdminPanel title="Registration trend" subtitle="Daily sign-ups, last 14 days" icon="lucide:chart-column" class="xl:col-span-2">
        <template #actions>
          <span class="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-800">
            <span class="dot-live" /> Live
          </span>
        </template>
        <AdminMiniBarChart :data="stats?.series ?? []" />
      </AdminPanel>

      <AdminPanel title="Registration status" subtitle="Share of every sign-up" icon="lucide:pie-chart">
        <AdminDonutStat :segments="statusSegments" :center-value="stats?.registrations ?? 0" center-label="total" />
      </AdminPanel>
    </section>

    <!-- top competitions + collection -->
    <section class="fade-up stagger-4 grid gap-4 xl:grid-cols-3">
      <AdminPanel title="Top competitions" subtitle="By registration volume" icon="lucide:list-ordered" class="xl:col-span-2">
        <div v-if="stats?.topComps?.length" class="space-y-4">
          <div v-for="(c, i) in stats.topComps" :key="i">
            <div class="mb-1.5 flex items-center justify-between gap-3 text-sm">
              <span class="flex min-w-0 items-center gap-2.5">
                <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-mist-1 text-[0.65rem] font-bold text-ink-faint">{{ i + 1 }}</span>
                <span class="truncate font-semibold text-ink">{{ c.name }}</span>
              </span>
              <span class="shrink-0 font-bold tabular-nums text-ink-soft">{{ c.n }}</span>
            </div>
            <div class="h-2 w-full overflow-hidden rounded-full bg-mist-1">
              <div class="meter-fill h-full rounded-full bg-gradient-brand" :style="{ width: `${Math.max(4, (c.n / topMax) * 100)}%` }" />
            </div>
          </div>
        </div>
        <AdminEmptyState v-else icon="lucide:trophy" title="No competitions yet" body="Add competitions to an event and their sign-ups will rank here.">
          <template #action>
            <NuxtLink to="/admin/events" class="btn-ghost">Go to events</NuxtLink>
          </template>
        </AdminEmptyState>
      </AdminPanel>

      <AdminPanel title="Event-day collection" subtitle="Items handed out at booths" icon="lucide:package-check">
        <div class="flex flex-col items-center justify-center py-2">
          <div class="relative h-28 w-28">
            <svg viewBox="0 0 36 36" class="h-full w-full -rotate-90" role="img" :aria-label="`${collectionPct}% collected`">
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#eef1f3" stroke-width="3.4" />
              <circle
                cx="18" cy="18" r="15.915" fill="none" stroke="#5e6f54" stroke-width="3.4" stroke-linecap="round"
                :stroke-dasharray="`${collectionPct} ${100 - collectionPct}`" stroke-dashoffset="25"
                style="transition: stroke-dasharray 800ms cubic-bezier(0.22, 1, 0.36, 1)"
              />
            </svg>
            <div class="absolute inset-0 flex flex-col items-center justify-center">
              <span class="text-2xl font-extrabold tabular-nums text-ink">{{ collectionPct }}%</span>
            </div>
          </div>
          <p class="mt-4 text-center text-sm text-ink-soft">
            <span class="font-bold text-ink">{{ stats?.checkins ?? 0 }}</span> collected across
            <span class="font-bold text-ink">{{ stats?.checkpoints ?? 0 }}</span> checkpoints
          </p>
          <NuxtLink to="/admin/checkins" class="mt-3 inline-flex items-center gap-1 text-xs font-bold text-brand-700 transition-colors hover:text-brand-800">
            Open collection report <Icon name="lucide:arrow-right" />
          </NuxtLink>
        </div>
      </AdminPanel>
    </section>

    <!-- recent registrations -->
    <AdminPanel title="Recent registrations" subtitle="Latest people to sign up" icon="lucide:user-plus" flush class="fade-up stagger-4">
      <template #actions>
        <NuxtLink to="/admin/registrations" class="inline-flex items-center gap-1 text-xs font-bold text-brand-700 transition-colors hover:text-brand-800">
          View all <Icon name="lucide:arrow-right" />
        </NuxtLink>
      </template>

      <div class="table-wrap">
        <table class="console-table min-w-[36rem]">
          <thead>
            <tr>
              <th scope="col">Participant</th>
              <th scope="col">Competition</th>
              <th scope="col">Status</th>
              <th scope="col" class="text-right">When</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in stats?.recent ?? []" :key="r.id">
              <td>
                <div class="flex items-center gap-3">
                  <AdminAvatar :name="r.fullName" />
                  <div class="min-w-0">
                    <p class="truncate font-semibold text-ink">{{ r.fullName }}</p>
                    <p class="truncate text-xs text-ink-faint">{{ r.email }}</p>
                  </div>
                </div>
              </td>
              <td class="text-ink-soft">{{ r.competitionName ?? '—' }}</td>
              <td><AdminStatusBadge :status="r.status" /></td>
              <td class="whitespace-nowrap text-right text-ink-faint">{{ timeAgo(r.createdAt) }}</td>
            </tr>
            <tr v-if="!stats?.recent?.length">
              <td colspan="4" class="!p-0">
                <AdminEmptyState icon="lucide:clipboard-list" title="No registrations yet" body="Sign-ups from the public form land here as soon as they arrive." />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </AdminPanel>
  </div>
</template>
