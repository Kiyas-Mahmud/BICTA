<script setup lang="ts">
// Review queue for preliminary submissions. This screen is the list: filters
// sit in one compact bar and everything below is teams. Reviewing a single
// submission happens on its own page, so the answers get the whole width.
definePageMeta({ layout: 'admin', middleware: 'admin' })

interface TeamRow {
  id: number
  teamName: string | null
  fullName: string
  email: string
  institution: string
  status: 'pending' | 'confirmed' | 'rejected'
  decisionNotifiedAt: string | null
  createdAt: string
  competitionName: string
  eventTitle: string
  teamSize: number
  missingRequired: number
}
interface Payload {
  competitions: { id: number; name: string; eventId: number; eventTitle: string; resultsAnnounceAt: string | null }[]
  events: { id: number; title: string }[]
  selected: { id: number; name: string; resultsAnnounceAt: string | null } | null
  awaitingAnnouncement: number
  counts: { all: number; pending: number; confirmed: number; rejected: number }
  teams: TeamRow[]
}

const toast = useToast()
const { confirm } = useConfirm()

const filters = reactive({ eventId: '', competitionId: '', status: 'all' as 'all' | 'pending' | 'confirmed' | 'rejected' })

const { data, refresh, pending } = await useFetch<Payload>('/api/admin/application-center', {
  query: computed(() => ({
    eventId: filters.eventId || undefined,
    competitionId: filters.competitionId || undefined,
    status: filters.status,
  })),
})

// Competition options follow the chosen event, and only ever list competitions
// that actually ask for a preliminary submission.
const competitionOptions = computed(() =>
  (data.value?.competitions ?? []).filter((c) => !filters.eventId || String(c.eventId) === filters.eventId),
)
watch(() => filters.eventId, () => { filters.competitionId = '' })

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'To review' },
  { key: 'confirmed', label: 'Selected' },
  { key: 'rejected', label: 'Rejected' },
] as const

// ---- announcement, only meaningful once a single competition is chosen ----
const announceAt = ref('')
watch(data, () => { announceAt.value = data.value?.selected?.resultsAnnounceAt ?? '' }, { immediate: true })
const savingSchedule = ref(false)
const scheduleOpen = ref(false)

async function saveSchedule(sendNow = false) {
  if (sendNow) {
    const ok = await confirm({
      title: 'Send results now?',
      body: 'Every decided team that has not been emailed yet is notified immediately, and the scheduled date is cleared.',
      confirmLabel: 'Send now',
      tone: 'brand',
    })
    if (!ok) return
  }
  savingSchedule.value = true
  try {
    const res = await $fetch<{ sent: number }>('/api/admin/application-center/announce', {
      method: 'POST',
      body: {
        competitionId: Number(filters.competitionId),
        announceAt: sendNow ? undefined : announceAt.value || null,
        sendNow,
      },
    })
    await refresh()
    toast.success(res.sent ? `${res.sent} team${res.sent === 1 ? '' : 's'} emailed` : 'Announcement schedule saved')
  } catch (e: any) {
    toast.error('Could not save', e?.data?.statusMessage ?? 'Try again in a moment.')
  } finally {
    savingSchedule.value = false
  }
}

const statusBadge = (s: string) =>
  s === 'confirmed' ? 'badge badge-green' : s === 'rejected' ? 'badge badge-orange' : 'badge badge-amber'
const statusLabel = (s: string) => (s === 'confirmed' ? 'Selected' : s === 'rejected' ? 'Rejected' : 'To review')

useSeoMeta({ title: 'Application center', robots: 'noindex' })
</script>

<template>
  <div class="space-y-4">
    <AdminPageHeader
      title="Application center"
      subtitle="Teams that submitted a preliminary application. Open one to review it and decide."
      icon="lucide:clipboard-check"
    >
      <template #badge>
        <span v-if="data?.awaitingAnnouncement" class="status status-warn">
          {{ data.awaitingAnnouncement }} awaiting announcement
        </span>
      </template>
      <template #actions>
        <button
          v-if="filters.competitionId"
          type="button"
          class="btn-secondary !py-2 text-sm"
          @click="scheduleOpen = !scheduleOpen"
        >
          <Icon name="lucide:megaphone" />
          {{ data?.selected?.resultsAnnounceAt ? `Announces ${data.selected.resultsAnnounceAt}` : 'Announcement' }}
        </button>
      </template>
    </AdminPageHeader>

    <!-- Compact filter bar: event, competition, then status tabs. -->
    <div class="surface p-3 sm:p-4">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div class="grid flex-1 gap-2 sm:grid-cols-2">
          <select v-model="filters.eventId" class="input !py-2 text-sm" aria-label="Event">
            <option value="">All events</option>
            <option v-for="e in data?.events ?? []" :key="e.id" :value="String(e.id)">{{ e.title }}</option>
          </select>
          <select v-model="filters.competitionId" class="input !py-2 text-sm" aria-label="Competition">
            <option value="">All competitions</option>
            <option v-for="c in competitionOptions" :key="c.id" :value="String(c.id)">{{ c.name }}</option>
          </select>
        </div>

        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="tab in TABS"
            :key="tab.key"
            type="button"
            class="rounded-lg px-3 py-1.5 text-xs font-bold transition-colors"
            :class="filters.status === tab.key ? 'bg-brand-600 text-white' : 'bg-mist-1 text-ink-soft hover:text-ink'"
            @click="filters.status = tab.key"
          >
            {{ tab.label }}
            <span class="opacity-70">{{ data?.counts?.[tab.key] ?? 0 }}</span>
          </button>
        </div>
      </div>

      <!-- Scheduling is a per-competition setting, so it stays tucked away
           until one is picked and the admin asks for it. -->
      <div v-if="scheduleOpen && filters.competitionId" class="mt-3 flex flex-wrap items-end gap-2 border-t border-line pt-3">
        <div class="min-w-[12rem] flex-1">
          <label class="label !mb-1 text-xs" for="ac-date">Announce results on</label>
          <input id="ac-date" v-model="announceAt" type="date" class="input !py-2 text-sm" />
        </div>
        <button type="button" class="btn-secondary !py-2 text-sm" :disabled="savingSchedule" @click="saveSchedule(false)">
          <Icon :name="savingSchedule ? 'lucide:loader-2' : 'lucide:calendar-check'" :class="{ 'animate-spin': savingSchedule }" />
          Save
        </button>
        <button
          type="button"
          class="btn-primary !py-2 text-sm"
          :disabled="savingSchedule || !data?.awaitingAnnouncement"
          @click="saveSchedule(true)"
        >
          <Icon name="lucide:send" /> Send now
          <span v-if="data?.awaitingAnnouncement">({{ data.awaitingAnnouncement }})</span>
        </button>
        <p class="w-full text-xs text-ink-faint">Blank emails each team the moment you decide.</p>
      </div>
    </div>

    <!-- Teams -->
    <AdminSkeletonRows v-if="pending" :rows="6" />

    <ul v-else-if="data?.teams.length" class="space-y-2">
      <li v-for="t in data.teams" :key="t.id">
        <NuxtLink
          :to="`/admin/application-center/${t.id}`"
          class="flex items-center gap-3 rounded-xl border border-line bg-white p-3 transition-colors hover:border-brand-300 hover:bg-brand-50/30 sm:px-4"
        >
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-mist-1 text-ink-soft">
            <Icon name="lucide:file-text" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-bold text-ink">
              {{ t.teamName || t.fullName }}
              <span class="ml-1 text-xs font-medium text-ink-faint">· {{ t.teamSize }} member{{ t.teamSize === 1 ? '' : 's' }}</span>
            </p>
            <p class="truncate text-xs text-ink-faint">
              {{ t.competitionName }} · {{ t.fullName }}<template v-if="t.institution"> · {{ t.institution }}</template>
            </p>
          </div>
          <div class="flex shrink-0 items-center gap-1.5">
            <span v-if="t.missingRequired" class="badge badge-orange hidden sm:inline-flex">{{ t.missingRequired }} missing</span>
            <span v-if="t.status !== 'pending' && !t.decisionNotifiedAt" class="badge badge-blue hidden sm:inline-flex">Scheduled</span>
            <span :class="statusBadge(t.status)">{{ statusLabel(t.status) }}</span>
            <Icon name="lucide:chevron-right" class="text-ink-faint" />
          </div>
        </NuxtLink>
      </li>
    </ul>

    <AdminEmptyState
      v-else
      icon="lucide:clipboard-check"
      title="No submissions to review"
      body="Only teams that have submitted a preliminary application appear here, for competitions that ask for one."
    />
  </div>
</template>
