<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

// Item-collection reporting: kit / lunch / snack pickups recorded by the
// scanner. There is no payment in this system, so no amounts appear here.
const eventId = ref<number | ''>('')
const competitionId = ref<number | ''>('')
const checkpointId = ref<number | ''>('')
const volunteerId = ref<number | ''>('')
const from = ref('')
const to = ref('')
const search = ref('')

const { data: tree } = await useFetch('/api/admin/event-tree', { key: 'admin-event-tree' })

const competitionOptions = computed(() => {
  const events = tree.value ?? []
  if (!eventId.value) return events.flatMap((e) => e.competitions)
  return events.find((e) => e.id === eventId.value)?.competitions ?? []
})
watch(eventId, () => {
  if (competitionId.value && !competitionOptions.value.some((c) => c.id === competitionId.value)) competitionId.value = ''
  checkpointId.value = ''
})

const debouncedSearch = ref('')
let t: ReturnType<typeof setTimeout> | undefined
watch(search, (v) => {
  clearTimeout(t)
  t = setTimeout(() => (debouncedSearch.value = v.trim()), 300)
})

const query = computed(() => ({
  ...(eventId.value ? { eventId: eventId.value } : {}),
  ...(competitionId.value ? { competitionId: competitionId.value } : {}),
  ...(checkpointId.value ? { checkpointId: checkpointId.value } : {}),
  ...(volunteerId.value ? { volunteerId: volunteerId.value } : {}),
  ...(from.value ? { from: from.value } : {}),
  ...(to.value ? { to: to.value } : {}),
  ...(debouncedSearch.value ? { search: debouncedSearch.value } : {}),
}))

const { data, pending } = await useFetch('/api/admin/checkins', { query })

const rows = computed(() => data.value?.rows ?? [])
const totals = computed(() => data.value?.totals ?? { collections: 0, participants: 0, byCheckpoint: {}, byCompetition: {} })

const exportQs = computed(() => {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(query.value)) p.set(k, String(v))
  return p.toString()
})
const exportUrl = computed(() => `/api/admin/checkins/export?${exportQs.value}`)
const exportExcelUrl = computed(() => `/api/admin/checkins/export-excel?${exportQs.value}`)

const filtersActive = computed(() =>
  Boolean(eventId.value || competitionId.value || checkpointId.value || volunteerId.value || from.value || to.value || search.value),
)
function clearFilters() {
  eventId.value = ''
  competitionId.value = ''
  checkpointId.value = ''
  volunteerId.value = ''
  from.value = ''
  to.value = ''
  search.value = ''
  debouncedSearch.value = ''
}
</script>

<template>
  <div class="space-y-6">
    <AdminPageHeader
      title="Collection Report"
      subtitle="Every kit, meal and snack handed out at a check-in point, and who handed it over."
      icon="lucide:package-check"
    >
      <template #actions>
        <a :href="exportUrl" class="btn-secondary !py-2.5" download><Icon name="lucide:download" /> CSV</a>
        <a :href="exportExcelUrl" class="btn-secondary !py-2.5" download><Icon name="lucide:sheet" /> Excel</a>
        <button class="btn-ghost" @click="() => print()"><Icon name="lucide:printer" /> Print / PDF</button>
      </template>
    </AdminPageHeader>

    <!-- totals -->
    <div class="fade-up stagger-1 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div class="surface p-4">
        <p class="console-label">Collections</p>
        <p class="mt-1 text-2xl font-extrabold tabular-nums leading-none text-ink">{{ totals.collections }}</p>
      </div>
      <div class="surface p-4">
        <p class="console-label">Participants served</p>
        <p class="mt-1 text-2xl font-extrabold tabular-nums leading-none text-ink">{{ totals.participants }}</p>
      </div>
      <div class="surface p-4 sm:col-span-2">
        <p class="console-label">By check-in point</p>
        <div v-if="Object.keys(totals.byCheckpoint).length" class="mt-2 flex flex-wrap gap-1.5">
          <span v-for="(n, name) in totals.byCheckpoint" :key="name" class="status status-brand">{{ name }}: {{ n }}</span>
        </div>
        <p v-else class="mt-1 text-sm text-ink-faint">Nothing collected yet.</p>
      </div>
    </div>

    <!-- filters -->
    <div class="toolbar fade-up stagger-2 no-print">
      <div class="select-wrap">
        <Icon name="lucide:calendar-days" />
        <label class="sr-only" for="c-event">Event</label>
        <select id="c-event" v-model="eventId" class="input w-full sm:w-44">
          <option value="">All events</option>
          <option v-for="e in tree ?? []" :key="e.id" :value="e.id">{{ e.title }}</option>
        </select>
      </div>

      <div class="select-wrap">
        <Icon name="lucide:trophy" />
        <label class="sr-only" for="c-comp">Competition</label>
        <select id="c-comp" v-model="competitionId" class="input w-full sm:w-40">
          <option value="">All competitions</option>
          <option v-for="c in competitionOptions" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </div>

      <div class="select-wrap">
        <Icon name="lucide:map-pin" />
        <label class="sr-only" for="c-point">Check-in point</label>
        <select id="c-point" v-model="checkpointId" class="input w-full sm:w-40">
          <option value="">All points</option>
          <option v-for="cp in data?.checkpoints ?? []" :key="cp.id" :value="cp.id">{{ cp.name }}</option>
        </select>
      </div>

      <div class="select-wrap">
        <Icon name="lucide:user-check" />
        <label class="sr-only" for="c-vol">Volunteer</label>
        <select id="c-vol" v-model="volunteerId" class="input w-full sm:w-40">
          <option value="">All staff</option>
          <option v-for="v in data?.volunteers ?? []" :key="v.id" :value="v.id">{{ v.name }}</option>
        </select>
      </div>

      <div class="flex items-center gap-1.5">
        <label class="sr-only" for="c-from">From date</label>
        <input id="c-from" v-model="from" type="date" class="input !w-auto" />
        <span class="text-xs text-ink-faint">to</span>
        <label class="sr-only" for="c-to">To date</label>
        <input id="c-to" v-model="to" type="date" class="input !w-auto" />
      </div>

      <div class="relative min-w-[11rem] flex-1">
        <Icon name="lucide:search" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
        <label class="sr-only" for="c-search">Search</label>
        <input id="c-search" v-model="search" type="search" class="input !pl-9" placeholder="Search participant or point" />
      </div>

      <button v-if="filtersActive" type="button" class="btn-ghost !py-2" @click="clearFilters">
        <Icon name="lucide:x" /> Clear
      </button>
    </div>

    <section class="surface fade-up stagger-3 overflow-hidden">
      <AdminSkeletonRows v-if="pending && !rows.length" :rows="6" :cols="5" />

      <div v-else class="table-wrap">
        <table class="console-table min-w-[52rem]">
          <thead>
            <tr>
              <th scope="col">Participant</th>
              <th scope="col">Event</th>
              <th scope="col">Competition</th>
              <th scope="col">Check-in point</th>
              <th scope="col">Collected by</th>
              <th scope="col">Collected at</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rows" :key="r.id">
              <td>
                <div class="flex items-center gap-3">
                  <AdminAvatar :name="r.participant" />
                  <div class="min-w-0">
                    <p class="truncate font-semibold text-ink">{{ r.participant }}</p>
                    <p class="truncate text-xs text-ink-faint">{{ r.email }}</p>
                  </div>
                </div>
              </td>
              <td class="text-ink-soft">{{ r.event }}</td>
              <td class="text-ink-soft">{{ r.competition ?? 'Event-wide' }}</td>
              <td>
                <p class="font-semibold text-ink">{{ r.checkpoint }}</p>
                <p v-if="r.checkpointLocation" class="text-xs text-ink-faint">{{ r.checkpointLocation }}</p>
              </td>
              <td class="text-ink-soft">{{ r.collectedBy ?? '—' }}</td>
              <td class="whitespace-nowrap text-ink-soft">{{ formatDay(r.collectedAt, { dateStyle: 'medium', timeStyle: 'short' }) }}</td>
            </tr>
            <tr v-if="!rows.length">
              <td colspan="6" class="!p-0">
                <AdminEmptyState
                  icon="lucide:package-check"
                  :title="filtersActive ? 'No collections match these filters' : 'Nothing collected yet'"
                  :body="filtersActive ? 'Try a wider date range or a different check-in point.' : 'Rows appear here as volunteers scan participants at the booths.'"
                >
                  <template v-if="filtersActive" #action><button class="btn-ghost" @click="clearFilters">Clear filters</button></template>
                </AdminEmptyState>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
