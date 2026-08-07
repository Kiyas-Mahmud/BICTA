<script setup lang="ts">
// Event dashboard. Everything on this screen belongs to ONE event, chosen in
// the switcher and reflected in the URL so a view can be linked and shared.
//
// The layout is phase-aware: a check-in heatmap two months before the event is
// noise, and an empty judging panel during registration is worse than absent.
// Widgets gate on `phase.flags` (independent booleans) rather than the single
// `phase` enum, because an event's competitions are routinely in different
// states at once.
definePageMeta({ layout: 'admin', middleware: 'admin' })

const { user } = useUserSession()
const route = useRoute()
const router = useRouter()

const eventId = computed(() => (route.query.event ? Number(route.query.event) : undefined))

const { data, pending } = await useFetch('/api/admin/dashboard', {
  query: computed(() => ({ eventId: eventId.value })),
  // Per-event key so switching refetches instead of serving another event's cache.
  key: computed(() => `admin-dashboard-${eventId.value ?? 'current'}`) as any,
})

function selectEvent(id: number) {
  router.replace({ query: { ...route.query, event: String(id) } })
}

const greeting = computed(() => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
})
const firstName = computed(() => ((user.value as any)?.name || 'there').split(' ')[0])

const ev = computed(() => data.value?.event ?? null)
const flags = computed(() => data.value?.phase?.flags)
const head = computed(() => data.value?.headline)

const PHASE_LABEL: Record<string, { text: string; cls: string }> = {
  'draft': { text: 'Draft', cls: 'bg-white/15' },
  'pre-registration': { text: 'Not open yet', cls: 'bg-white/15' },
  'registration-open': { text: 'Registration open', cls: 'bg-white/25' },
  'review': { text: 'Reviewing applications', cls: 'bg-white/25' },
  'event-live': { text: 'Event running', cls: 'bg-white/30' },
  'judging': { text: 'Judging', cls: 'bg-white/25' },
  'complete': { text: 'Complete', cls: 'bg-white/15' },
}
const phaseChip = computed(() => PHASE_LABEL[data.value?.phase?.phase ?? 'complete'])

/**
 * Exactly one hero figure per view, and which number it is depends on where
 * the event is. During registration the question is "how many signed up";
 * on the day it is "how many are through the door".
 */
const hero = computed(() => {
  const d = data.value
  if (!d || !d.event) return null
  const f = d.phase?.flags
  if (f?.anyCompetitionLive) {
    return { value: d.collection.collected, label: 'items collected', sub: `of ${d.collection.eligible} eligible` }
  }
  if (f?.decisionsPending) {
    return { value: d.applications.totals.pendingReview, label: 'applications to review', sub: 'awaiting a decision' }
  }
  if (d.phase?.phase === 'judging') {
    const scored = d.judging.reduce((a, j) => a + j.teamsScored, 0)
    const total = d.judging.reduce((a, j) => a + j.teamsTotal, 0)
    return { value: scored, label: 'teams scored', sub: `of ${total} selected` }
  }
  return { value: d.headline.people, label: 'participants', sub: `${d.headline.teams.active} active teams` }
})

// Only surfaced when there is something to do.
const attention = computed(() => {
  const d = data.value
  if (!d) return []
  const items: { icon: string; label: string; count: number; to: string; tone: string }[] = []
  if (d.applications.totals.pendingReview)
    items.push({ icon: 'lucide:clipboard-check', label: 'applications awaiting review', count: d.applications.totals.pendingReview, to: '/admin/application-center', tone: 'amber' })
  // Decided, embargo lifted, still not emailed — means a scheduled run was missed.
  if (d.applications.totals.awaitingAnnouncement.overdue)
    items.push({ icon: 'lucide:mail-warning', label: 'results decided but not sent', count: d.applications.totals.awaitingAnnouncement.overdue, to: '/admin/application-center', tone: 'red' })
  if (d.applications.totals.missingRequired)
    items.push({ icon: 'lucide:file-warning', label: 'submissions missing required answers', count: d.applications.totals.missingRequired, to: '/admin/application-center', tone: 'amber' })
  if (d.collection.orphanedCheckins)
    items.push({ icon: 'lucide:scan-line', label: 'check-ins not tied to a registration', count: d.collection.orphanedCheckins, to: '/admin/checkins', tone: 'amber' })
  if (d.event && !d.event.published)
    items.push({ icon: 'lucide:eye-off', label: 'this event is still a draft', count: 0, to: `/admin/events/${d.event.id}`, tone: 'red' })
  return items
})
const tone: Record<string, string> = {
  amber: 'bg-amber-50 text-amber-700 ring-amber-100',
  brand: 'bg-brand-50 text-brand-800 ring-brand-100',
  red: 'bg-red-50 text-red-600 ring-red-100',
}

const deltaN = computed(() => {
  const d = head.value?.delta?.registrations
  return d ? d.current - d.previous : null
})

const showCollection = computed(() => (data.value?.collection.checkpoints.length ?? 0) > 0)
const showJudging = computed(() => flags.value?.judgingOpen && (data.value?.judging.length ?? 0) > 0)
const showApplications = computed(() => data.value?.applications.inScope)

useSeoMeta({ title: 'Dashboard', robots: 'noindex' })
</script>

<template>
  <div class="space-y-5">
    <!-- Event switcher: the scope for everything below. -->
    <div v-if="(data?.events.length ?? 0) > 1" class="-mx-1 overflow-x-auto px-1">
      <div class="flex w-max gap-2" role="tablist" aria-label="Choose an event">
        <button
          v-for="e in data?.events"
          :key="e.id"
          type="button"
          role="tab"
          :aria-selected="e.id === ev?.id"
          class="flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-bold transition-colors"
          :class="e.id === ev?.id
            ? 'border-brand-500 bg-brand-600 text-white shadow-soft'
            : 'border-line bg-white text-ink-soft hover:border-brand-300 hover:text-ink'"
          @click="selectEvent(e.id)"
        >
          {{ e.title }}
          <span v-if="e.isCurrent" class="rounded-md px-1.5 py-0.5 text-[0.6rem] uppercase tracking-wide"
            :class="e.id === ev?.id ? 'bg-white/20' : 'bg-mist-1'">Current</span>
        </button>
      </div>
    </div>

    <!-- Header + the single hero figure -->
    <section class="fade-up relative overflow-hidden rounded-2xl bg-gradient-brand p-6 text-white shadow-soft sm:p-7">
      <span class="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
      <div class="relative flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div class="min-w-0">
          <p class="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-white/70">{{ greeting }}, {{ firstName }}</p>
          <h1 class="mt-2 truncate text-2xl font-extrabold tracking-[-0.02em] sm:text-3xl">
            {{ ev?.title ?? 'No events yet' }}
          </h1>
          <div class="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span v-if="phaseChip" class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-bold" :class="phaseChip.cls">
              {{ phaseChip.text }}
            </span>
            <span v-if="ev?.venue" class="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 font-semibold text-white/90">
              <Icon name="lucide:map-pin" class="text-sm" /> {{ ev.venue }}
            </span>
            <span class="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 font-semibold text-white/90">
              <Icon name="lucide:trophy" class="text-sm" /> {{ head?.competitions ?? 0 }} competitions
            </span>
          </div>
        </div>

        <!-- Hero figure: proportional digits, not tabular — this is a
             standalone number, not a column. -->
        <div v-if="hero" class="min-w-0">
          <p class="text-5xl font-extrabold leading-none tracking-[-0.03em]">{{ hero.value }}</p>
          <p class="mt-1.5 text-sm font-bold text-white/90">{{ hero.label }}</p>
          <p class="text-xs text-white/65">{{ hero.sub }}</p>
        </div>
      </div>
    </section>

    <!-- Work waiting -->
    <section v-if="attention.length" class="fade-up stagger-1 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <NuxtLink
        v-for="a in attention"
        :key="a.label"
        :to="a.to"
        class="surface flex items-center gap-3 p-4 transition-transform duration-200 hover:-translate-y-0.5"
      >
        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset" :class="tone[a.tone]">
          <Icon :name="a.icon" />
        </span>
        <p class="min-w-0 flex-1 text-sm text-ink-soft">
          <span v-if="a.count" class="font-extrabold text-ink">{{ a.count }}</span>
          {{ a.label }}
        </p>
        <Icon name="lucide:arrow-right" class="shrink-0 text-ink-faint" />
      </NuxtLink>
    </section>

    <!-- KPI row -->
    <section class="fade-up stagger-1 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <AdminStatCard
        label="Participants" :value="head?.people ?? 0" icon="lucide:users" tone="brand"
        :caption="`${head?.participations ?? 0} entries across competitions`"
        :delta="deltaN"
      />
      <AdminStatCard
        label="Teams" :value="head?.teams.active ?? 0" icon="lucide:users-round" tone="ink"
        :caption="`${head?.teams.confirmed ?? 0} selected · ${head?.teams.pending ?? 0} awaiting`"
      />
      <AdminStatCard
        label="Institutions" :value="head?.institutions ?? 0" icon="lucide:graduation-cap" tone="green"
        caption="Distinct schools represented"
      />
      <AdminStatCard
        label="Prize pool" :value="head?.prizePool.value ?? 0" icon="lucide:banknote" tone="amber"
        :caption="head?.prizePool.currencyMixed ? 'Mixed currencies — total is indicative' : `Across ${head?.prizePool.entries ?? 0} prizes`"
      />
    </section>

    <!-- Funnel + trend -->
    <section class="fade-up stagger-2 grid gap-5 lg:grid-cols-2">
      <AdminPanel title="Where people drop off" subtitle="Every stage counts entries, so the bars are directly comparable." icon="lucide:filter">
        <AdminChartsFunnel v-if="(data?.funnel.stages.length ?? 0) > 0" :stages="data!.funnel.stages" />
        <p
          v-if="data?.funnel.stages[4]?.meta?.anyStatus && data.funnel.stages[4].meta.anyStatus !== data.funnel.stages[4].value"
          class="mt-3 rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs font-semibold text-amber-800"
        >
          {{ data.funnel.stages[4].meta.anyStatus }} people have checked in in total — the difference is teams that
          collected before their registration was selected.
        </p>
      </AdminPanel>

      <AdminPanel title="Sign-ups over time" :subtitle="`${data?.trend.from} to ${data?.trend.to}`" icon="lucide:trending-up">
        <AdminChartsArea v-if="data?.trend.series.length" :series="data.trend.series" />
        <p v-if="data?.trend.windowShifted" class="mt-2 text-xs text-ink-faint">
          Showing the most recent period with activity, not the last 30 days.
        </p>
      </AdminPanel>
    </section>

    <!-- Per-competition -->
    <AdminPanel
      v-if="(data?.competitions.length ?? 0) > 0"
      title="Competitions" subtitle="Registrations by review status." icon="lucide:trophy" class="fade-up stagger-3"
    >
      <AdminChartsStatusBar :rows="data!.competitions" />
    </AdminPanel>

    <!-- Applications -->
    <AdminPanel
      v-if="showApplications" title="Preliminary submissions"
      subtitle="Only competitions that ask for an application." icon="lucide:clipboard-list" class="fade-up"
    >
      <div class="grid gap-5 sm:grid-cols-2">
        <AdminMeter
          :value="data!.applications.totals.submitted" :max="data!.applications.totals.expected"
          label="Submitted" ramped
        />
        <div class="grid grid-cols-3 gap-3 text-center">
          <div><p class="text-xl font-extrabold text-ink">{{ data!.applications.totals.pendingReview }}</p><p class="text-xs text-ink-faint">To review</p></div>
          <div><p class="text-xl font-extrabold text-ink">{{ data!.applications.totals.awaitingAnnouncement.embargoed }}</p><p class="text-xs text-ink-faint">Embargoed</p></div>
          <div><p class="text-xl font-extrabold text-ink">{{ data!.applications.totals.missingRequired }}</p><p class="text-xs text-ink-faint">Incomplete</p></div>
        </div>
      </div>
    </AdminPanel>

    <!-- Event-day collection -->
    <AdminPanel
      v-if="showCollection" title="Event-day collection"
      subtitle="Share of eligible entries that collected at each desk." icon="lucide:package-check" class="fade-up"
    >
      <template #actions>
        <NuxtLink to="/admin/checkins" class="btn-secondary !py-2 text-sm"><Icon name="lucide:external-link" /> Report</NuxtLink>
      </template>
      <AdminMeter
        :value="data!.collection.collected" :max="data!.collection.eligible"
        label="Overall" ramped class="mb-5"
      />
      <AdminChartsHeatmap
        v-if="data!.collection.columns.length"
        :checkpoints="data!.collection.checkpoints" :columns="data!.collection.columns" :cells="data!.collection.cells"
      />
    </AdminPanel>

    <!-- Judging -->
    <AdminPanel v-if="showJudging" title="Judging progress" subtitle="Teams with at least one complete score sheet." icon="lucide:gavel" class="fade-up">
      <ul class="space-y-4">
        <li v-for="j in data!.judging" :key="j.competitionId">
          <AdminMeter
            :value="j.teamsScored" :max="j.teamsTotal" :label="j.name"
            :caption="j.teamsTotal ? `${j.teamsScored} / ${j.teamsTotal} teams · ${j.judgesTotal} judges · ${j.criteriaCount} criteria` : 'No selected teams yet'"
            ramped
          />
        </li>
      </ul>
    </AdminPanel>

    <!-- Reach + recent -->
    <section class="fade-up grid gap-5 lg:grid-cols-2">
      <AdminPanel title="Where teams come from" icon="lucide:graduation-cap">
        <ul v-if="data?.institutions.length" class="space-y-3">
          <li v-for="(i, idx) in data.institutions" :key="i.name">
            <AdminMeter
              :value="i.teams" :max="data.institutions[0]!.teams" :label="i.name"
              :caption="`${i.teams} team${i.teams === 1 ? '' : 's'} · ${i.people} people`"
              size="sm" :ramped="idx === 0"
            />
          </li>
        </ul>
        <AdminEmptyState v-else icon="lucide:graduation-cap" title="No institutions yet" body="They appear as teams register." />
      </AdminPanel>

      <AdminPanel title="Latest sign-ups" icon="lucide:user-plus">
        <template #actions>
          <NuxtLink to="/admin/registrations" class="text-xs font-bold text-brand-700 hover:underline">View all</NuxtLink>
        </template>
        <ul v-if="data?.recentRegistrations.length" class="space-y-2">
          <li v-for="r in data.recentRegistrations" :key="r.id" class="flex items-center gap-3 rounded-xl border border-line p-2.5 sm:px-3">
            <AdminAvatar :name="r.teamName || r.fullName" />
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-bold text-ink">{{ r.teamName || r.fullName }}</p>
              <p class="truncate text-xs text-ink-faint">{{ r.competitionName }}</p>
            </div>
            <AdminStatusBadge :status="r.status" />
          </li>
        </ul>
        <AdminEmptyState v-else icon="lucide:user-plus" title="No registrations yet" body="Sign-ups will appear here." />
      </AdminPanel>
    </section>

    <AdminSkeletonRows v-if="pending && !data" :rows="6" />
  </div>
</template>
