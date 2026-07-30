<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

// Event -> Competition -> list. Every filter is a server query parameter so
// paging, totals and export all agree with what is on screen.
const eventId = ref<number | ''>('')
const competitionId = ref<number | ''>('')
const status = ref<'' | 'pending' | 'confirmed' | 'rejected'>('')
const search = ref('')
const sort = ref<'createdAt' | 'fullName' | 'email' | 'status' | 'competition' | 'teamName'>('createdAt')
const dir = ref<'asc' | 'desc'>('desc')
const page = ref(1)
const perPage = ref(25)

const { data: tree } = await useFetch('/api/admin/event-tree', { key: 'admin-event-tree' })

const competitionOptions = computed(() => {
  const events = tree.value ?? []
  if (!eventId.value) return events.flatMap((e) => e.competitions.map((c) => ({ ...c, eventTitle: e.title })))
  return (events.find((e) => e.id === eventId.value)?.competitions ?? []).map((c) => ({ ...c, eventTitle: '' }))
})

// Changing the event invalidates a competition that no longer belongs to it.
watch(eventId, () => {
  if (!competitionId.value) return
  if (!competitionOptions.value.some((c) => c.id === competitionId.value)) competitionId.value = ''
})

// Debounce typing so each keystroke is not a query.
const debouncedSearch = ref('')
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, (v) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => (debouncedSearch.value = v.trim()), 300)
})

const query = computed(() => ({
  ...(eventId.value ? { eventId: eventId.value } : {}),
  ...(competitionId.value ? { competitionId: competitionId.value } : {}),
  ...(status.value ? { status: status.value } : {}),
  ...(debouncedSearch.value ? { search: debouncedSearch.value } : {}),
  sort: sort.value,
  dir: dir.value,
  page: page.value,
  perPage: perPage.value,
}))

const { data, refresh, pending } = await useFetch('/api/admin/registrations', { query })

// Any filter change resets to page 1; paging itself obviously must not.
watch([eventId, competitionId, status, debouncedSearch, perPage], () => (page.value = 1))

const rows = computed(() => data.value?.rows ?? [])
const counts = computed(() => data.value?.counts ?? { total: 0, pending: 0, confirmed: 0, rejected: 0 })
const totalPages = computed(() => data.value?.totalPages ?? 1)

const expanded = ref<number | null>(null)
const busyId = ref<number | null>(null)
const toast = useToast()

async function setStatus(id: number, newStatus: string, name: string) {
  busyId.value = id
  try {
    await $fetch(`/api/admin/registrations/${id}`, { method: 'PUT', body: { status: newStatus } })
    await Promise.all([refresh(), refreshAdminStats()])
    toast.success(`${name} marked ${newStatus}`)
  } catch {
    toast.error('Could not update that registration', 'Check your connection and try again.')
  } finally {
    busyId.value = null
  }
}

const exportQs = computed(() => {
  const p = new URLSearchParams()
  if (eventId.value) p.set('eventId', String(eventId.value))
  if (competitionId.value) p.set('competitionId', String(competitionId.value))
  if (status.value) p.set('status', status.value)
  if (debouncedSearch.value) p.set('search', debouncedSearch.value)
  p.set('sort', sort.value)
  p.set('dir', dir.value)
  return p.toString()
})
const exportUrl = computed(() => `/api/admin/registrations/export?${exportQs.value}`)
const exportExcelUrl = computed(() => `/api/admin/registrations/export-excel?${exportQs.value}`)

function toggleSort(key: typeof sort.value) {
  if (sort.value === key) {
    dir.value = dir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sort.value = key
    dir.value = key === 'createdAt' ? 'desc' : 'asc'
  }
  page.value = 1
}
function sortIcon(key: typeof sort.value) {
  if (sort.value !== key) return 'lucide:chevrons-up-down'
  return dir.value === 'asc' ? 'lucide:arrow-up' : 'lucide:arrow-down'
}

const tiles = computed(() => [
  { key: '' as const, label: 'All', value: counts.value.total, tone: 'ink', icon: 'lucide:clipboard-list' },
  { key: 'pending' as const, label: 'Pending', value: counts.value.pending, tone: 'amber', icon: 'lucide:clock' },
  { key: 'confirmed' as const, label: 'Confirmed', value: counts.value.confirmed, tone: 'green', icon: 'lucide:check' },
  { key: 'rejected' as const, label: 'Rejected', value: counts.value.rejected, tone: 'red', icon: 'lucide:x' },
])
const tileTone: Record<string, string> = {
  ink: 'bg-mist-2 text-ink ring-line',
  amber: 'bg-amber-50 text-amber-700 ring-amber-100',
  green: 'bg-green-50 text-green-700 ring-green-100',
  red: 'bg-red-50 text-red-600 ring-red-100',
}

const filtersActive = computed(() => Boolean(eventId.value || competitionId.value || status.value || search.value))
function clearFilters() {
  eventId.value = ''
  competitionId.value = ''
  status.value = ''
  search.value = ''
  debouncedSearch.value = ''
  page.value = 1
}
</script>

<template>
  <div class="space-y-6">
    <AdminPageHeader
      title="Registrations"
      subtitle="Review, confirm and export participant sign-ups."
      icon="lucide:clipboard-list"
    >
      <template #actions>
        <a :href="exportUrl" class="btn-secondary !py-2.5" download><Icon name="lucide:download" /> CSV</a>
        <a :href="exportExcelUrl" class="btn-secondary !py-2.5" download><Icon name="lucide:sheet" /> Excel</a>
      </template>
    </AdminPageHeader>

    <!-- summary tiles double as the status filter -->
    <div class="fade-up stagger-1 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <button
        v-for="t in tiles"
        :key="t.label"
        type="button"
        class="surface flex items-center gap-3.5 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift"
        :class="status === t.key ? 'border-brand-400 ring-1 ring-brand-200' : 'hover:border-brand-300'"
        :aria-pressed="status === t.key"
        @click="status = t.key"
      >
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset" :class="tileTone[t.tone]">
          <Icon :name="t.icon" class="text-lg" />
        </span>
        <span class="min-w-0">
          <span class="console-label block">{{ t.label }}</span>
          <span class="mt-0.5 block text-xl font-extrabold tabular-nums leading-none text-ink">{{ t.value }}</span>
        </span>
      </button>
    </div>

    <!-- hierarchical filters: Event -> Competition -->
    <div class="toolbar fade-up stagger-2">
      <div class="select-wrap">
        <Icon name="lucide:calendar-days" />
        <label class="sr-only" for="reg-event">Event</label>
        <select id="reg-event" v-model="eventId" class="input w-full sm:w-52">
          <option value="">All events</option>
          <option v-for="e in tree ?? []" :key="e.id" :value="e.id">{{ e.title }} ({{ e.year }})</option>
        </select>
      </div>

      <div class="select-wrap">
        <Icon name="lucide:trophy" />
        <label class="sr-only" for="reg-comp">Competition</label>
        <select id="reg-comp" v-model="competitionId" class="input w-full sm:w-52" :disabled="!competitionOptions.length">
          <option value="">{{ eventId ? 'All competitions in event' : 'All competitions' }}</option>
          <option v-for="c in competitionOptions" :key="c.id" :value="c.id">
            {{ c.name }}<template v-if="c.eventTitle"> · {{ c.eventTitle }}</template>
          </option>
        </select>
      </div>

      <div class="relative min-w-[12rem] flex-1">
        <Icon name="lucide:search" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
        <label class="sr-only" for="reg-search">Search registrations</label>
        <input id="reg-search" v-model="search" type="search" class="input !pl-9" placeholder="Search name, email, team or institution" />
      </div>

      <button v-if="filtersActive" type="button" class="btn-ghost !py-2" @click="clearFilters">
        <Icon name="lucide:x" /> Clear
      </button>
    </div>

    <section class="surface fade-up stagger-3 overflow-hidden">
      <AdminSkeletonRows v-if="pending && !rows.length" :rows="6" :cols="5" />

      <template v-else>
        <!-- mobile: stacked cards -->
        <ul class="divide-y divide-line lg:hidden">
          <li v-for="r in rows" :key="r.id" class="p-4">
            <div class="flex items-start gap-3">
              <AdminAvatar :name="r.fullName" />
              <div class="min-w-0 flex-1">
                <div class="flex items-start justify-between gap-2">
                  <p class="truncate font-bold text-ink">{{ r.fullName }}</p>
                  <AdminStatusBadge :status="r.status" />
                </div>
                <p class="truncate text-xs text-ink-faint">{{ r.email }}</p>
                <p class="mt-1.5 text-xs text-ink-soft">
                  {{ r.eventTitle }} · {{ r.competitionName }}<span v-if="r.teamName"> · {{ r.teamName }}</span>
                </p>
                <p class="mt-0.5 text-xs text-ink-faint">Registered {{ formatDay(r.createdAt) }}</p>

                <div class="mt-3 flex flex-wrap gap-2">
                  <button v-if="r.status !== 'confirmed'" class="btn-ghost !py-2 !text-xs" :disabled="busyId === r.id" @click="setStatus(r.id, 'confirmed', r.fullName)">
                    <Icon name="lucide:check" class="text-green-700" /> Confirm
                  </button>
                  <button v-if="r.status !== 'rejected'" class="btn-ghost !py-2 !text-xs" :disabled="busyId === r.id" @click="setStatus(r.id, 'rejected', r.fullName)">
                    <Icon name="lucide:x" class="text-red-600" /> Reject
                  </button>
                  <button class="btn-ghost !py-2 !text-xs" @click="expanded = expanded === r.id ? null : r.id">
                    <Icon name="lucide:chevron-down" :class="{ 'rotate-180': expanded === r.id }" class="transition-transform" /> Details
                  </button>
                </div>

                <Transition name="row">
                  <div v-if="expanded === r.id" class="mt-3 space-y-3">
                    <dl class="space-y-2 rounded-xl bg-mist-1 p-3 text-sm">
                      <div><dt class="console-label">Phone</dt><dd class="text-ink-soft">{{ r.phone }}</dd></div>
                      <div><dt class="console-label">Institution</dt><dd class="text-ink-soft">{{ r.institution || '—' }}</dd></div>
                      <div><dt class="console-label">Notes</dt><dd class="whitespace-pre-wrap text-ink-soft">{{ r.notes || '—' }}</dd></div>
                    </dl>
                    <AdminTeamManager :registration-id="r.id" @changed="refresh" />
                  </div>
                </Transition>
              </div>
            </div>
          </li>
          <li v-if="!rows.length">
            <AdminEmptyState
              icon="lucide:clipboard-list"
              :title="filtersActive ? 'No matches' : 'No registrations yet'"
              :body="filtersActive ? 'Try a different filter or clear them all.' : 'Sign-ups from the public form appear here.'"
            >
              <template v-if="filtersActive" #action><button class="btn-ghost" @click="clearFilters">Clear filters</button></template>
            </AdminEmptyState>
          </li>
        </ul>

        <!-- desktop: sortable table -->
        <div class="table-wrap hidden lg:block">
          <table class="console-table">
            <thead>
              <tr>
                <th scope="col">
                  <button class="th-sort" @click="toggleSort('fullName')">Participant <Icon :name="sortIcon('fullName')" /></button>
                </th>
                <th scope="col">Event</th>
                <th scope="col">
                  <button class="th-sort" @click="toggleSort('competition')">Competition <Icon :name="sortIcon('competition')" /></button>
                </th>
                <th scope="col">
                  <button class="th-sort" @click="toggleSort('teamName')">Team <Icon :name="sortIcon('teamName')" /></button>
                </th>
                <th scope="col">
                  <button class="th-sort" @click="toggleSort('status')">Status <Icon :name="sortIcon('status')" /></button>
                </th>
                <th scope="col">
                  <button class="th-sort" @click="toggleSort('createdAt')">Registered <Icon :name="sortIcon('createdAt')" /></button>
                </th>
                <th scope="col" class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="r in rows" :key="r.id">
                <tr :class="expanded === r.id ? 'bg-brand-50' : ''">
                  <td>
                    <button class="flex w-full items-center gap-3 rounded-lg text-left" :aria-expanded="expanded === r.id" @click="expanded = expanded === r.id ? null : r.id">
                      <AdminAvatar :name="r.fullName" />
                      <span class="min-w-0 flex-1">
                        <span class="block truncate font-semibold text-ink">{{ r.fullName }}</span>
                        <span class="block truncate text-xs text-ink-faint">{{ r.email }}</span>
                      </span>
                      <Icon name="lucide:chevron-down" class="shrink-0 text-ink-faint transition-transform duration-200" :class="{ 'rotate-180': expanded === r.id }" />
                    </button>
                  </td>
                  <td class="text-ink-soft">{{ r.eventTitle }}</td>
                  <td class="text-ink-soft">{{ r.competitionName }}</td>
                  <td class="text-ink-soft">{{ r.teamName ?? '—' }}</td>
                  <td><AdminStatusBadge :status="r.status" /></td>
                  <td class="whitespace-nowrap text-ink-soft">{{ formatDay(r.createdAt) }}</td>
                  <td>
                    <div class="row-actions">
                      <button v-if="r.status !== 'confirmed'" class="icon-btn-sm icon-btn-ok" :disabled="busyId === r.id" :aria-label="`Confirm ${r.fullName}`" title="Confirm" @click="setStatus(r.id, 'confirmed', r.fullName)">
                        <Icon :name="busyId === r.id ? 'lucide:loader-2' : 'lucide:check'" :class="{ 'animate-spin': busyId === r.id }" />
                      </button>
                      <button v-if="r.status !== 'rejected'" class="icon-btn-sm icon-btn-danger" :disabled="busyId === r.id" :aria-label="`Reject ${r.fullName}`" title="Reject" @click="setStatus(r.id, 'rejected', r.fullName)">
                        <Icon name="lucide:x" />
                      </button>
                    </div>
                  </td>
                </tr>
                <tr v-if="expanded === r.id" class="bg-brand-50">
                  <td colspan="7" class="!py-4">
                    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <div><p class="console-label">Phone</p><p class="mt-0.5 text-ink-soft">{{ r.phone }}</p></div>
                      <div><p class="console-label">Institution</p><p class="mt-0.5 text-ink-soft">{{ r.institution || '—' }}</p></div>
                      <div class="sm:col-span-2"><p class="console-label">Notes</p><p class="mt-0.5 whitespace-pre-wrap text-ink-soft">{{ r.notes || '—' }}</p></div>
                    </div>
                    <div class="mt-4">
                      <AdminTeamManager :registration-id="r.id" @changed="refresh" />
                    </div>
                  </td>
                </tr>
              </template>
              <tr v-if="!rows.length">
                <td colspan="7" class="!p-0">
                  <AdminEmptyState
                    icon="lucide:clipboard-list"
                    :title="filtersActive ? 'No registrations match these filters' : 'No registrations yet'"
                    :body="filtersActive ? 'Try a different event, competition, status or search term.' : 'Sign-ups from the public form appear here as soon as they arrive.'"
                  >
                    <template v-if="filtersActive" #action><button class="btn-ghost" @click="clearFilters">Clear filters</button></template>
                  </AdminEmptyState>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- pagination -->
        <div v-if="rows.length" class="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 sm:px-5">
          <p class="text-xs text-ink-faint">
            Showing <span class="font-bold text-ink">{{ rows.length }}</span> of
            <span class="font-bold text-ink">{{ data?.total ?? 0 }}</span>
            <span v-if="filtersActive"> filtered</span> registrations
          </p>
          <div class="flex items-center gap-2">
            <label class="sr-only" for="reg-per-page">Rows per page</label>
            <select id="reg-per-page" v-model.number="perPage" class="input !w-auto !py-1.5 text-xs">
              <option :value="10">10 / page</option>
              <option :value="25">25 / page</option>
              <option :value="50">50 / page</option>
              <option :value="100">100 / page</option>
            </select>
            <button class="icon-btn-sm" :disabled="page <= 1" aria-label="Previous page" @click="page--">
              <Icon name="lucide:chevron-left" />
            </button>
            <span class="text-xs font-semibold tabular-nums text-ink-soft">{{ page }} / {{ totalPages }}</span>
            <button class="icon-btn-sm" :disabled="page >= totalPages" aria-label="Next page" @click="page++">
              <Icon name="lucide:chevron-right" />
            </button>
          </div>
        </div>
      </template>
    </section>
  </div>
</template>
