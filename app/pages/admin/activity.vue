<script setup lang="ts">
// Main-admin-only activity trail: who created, edited, deleted or decided what.
definePageMeta({ layout: 'admin', middleware: ['admin', 'main-admin'] })

interface LogRow {
  id: number
  actorId: number | null
  actorName: string
  actorEmail: string
  actorRole: string
  action: string
  entity: string
  entityId: number | null
  summary: string
  createdAt: string
}
interface LogPayload {
  rows: LogRow[]
  hasMore: boolean
  actors: { id: number | null; name: string; role: string }[]
  entities: string[]
}

const filters = reactive({ actorId: '', entity: '', action: '', q: '' })
const limit = ref(100)

const params = computed(() => ({
  actorId: filters.actorId || undefined,
  entity: filters.entity || undefined,
  action: filters.action || undefined,
  q: filters.q || undefined,
  limit: limit.value,
}))

const { data, pending } = await useFetch<LogPayload>('/api/admin/audit-logs', { query: params })

const ACTION_STYLE: Record<string, { badge: string; icon: string }> = {
  create: { badge: 'badge-green', icon: 'lucide:plus' },
  update: { badge: 'badge-blue', icon: 'lucide:pencil' },
  delete: { badge: 'badge-orange', icon: 'lucide:trash-2' },
  decide: { badge: 'badge-purple', icon: 'lucide:gavel' },
  notify: { badge: 'badge-amber', icon: 'lucide:mail' },
  login: { badge: 'badge-gray', icon: 'lucide:log-in' },
}
const styleFor = (action: string) => ACTION_STYLE[action] ?? { badge: 'badge-gray', icon: 'lucide:dot' }

// Timestamps are stored as UTC; render them in the reader's local zone.
function stamp(iso: string) {
  const d = new Date(iso.includes('T') ? iso : `${iso.replace(' ', 'T')}Z`)
  return d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
}

function reset() {
  Object.assign(filters, { actorId: '', entity: '', action: '', q: '' })
  limit.value = 100
}
const filtered = computed(() => Boolean(filters.actorId || filters.entity || filters.action || filters.q))

useSeoMeta({ title: 'Activity log', robots: 'noindex' })
</script>

<template>
  <div class="space-y-6">
    <AdminPageHeader
      title="Activity log"
      subtitle="Every create, edit, delete and decision made in the console, and who made it."
      icon="lucide:history"
    >
      <template #badge>
        <span class="status status-neutral">Main admin only</span>
      </template>
    </AdminPageHeader>

    <AdminPanel title="Filter" icon="lucide:filter" class="fade-up">
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <label class="label" for="f-actor">Person</label>
          <select id="f-actor" v-model="filters.actorId" class="input">
            <option value="">Everyone</option>
            <option v-for="a in data?.actors ?? []" :key="a.id!" :value="String(a.id)">
              {{ a.name || 'Unknown' }}<template v-if="a.role"> ({{ a.role }})</template>
            </option>
          </select>
        </div>
        <div>
          <label class="label" for="f-entity">Type</label>
          <select id="f-entity" v-model="filters.entity" class="input">
            <option value="">Everything</option>
            <option v-for="e in data?.entities ?? []" :key="e" :value="e">{{ e }}</option>
          </select>
        </div>
        <div>
          <label class="label" for="f-action">Action</label>
          <select id="f-action" v-model="filters.action" class="input">
            <option value="">Any action</option>
            <option value="create">Created</option>
            <option value="update">Edited</option>
            <option value="delete">Deleted</option>
            <option value="decide">Decided</option>
            <option value="notify">Notified</option>
          </select>
        </div>
        <div>
          <label class="label" for="f-q">Search</label>
          <input id="f-q" v-model="filters.q" class="input" placeholder="Name or description" />
        </div>
      </div>
      <div v-if="filtered" class="mt-3">
        <button type="button" class="btn-secondary !py-2 text-sm" @click="reset">
          <Icon name="lucide:x" /> Clear filters
        </button>
      </div>
    </AdminPanel>

    <AdminPanel title="History" icon="lucide:list" class="fade-up stagger-1">
      <template #actions>
        <span v-if="data?.rows.length" class="status status-neutral">{{ data.rows.length }} shown</span>
      </template>

      <AdminSkeletonRows v-if="pending" :rows="6" />

      <ol v-else-if="data?.rows.length" class="space-y-2">
        <li
          v-for="row in data.rows"
          :key="row.id"
          class="flex items-start gap-3 rounded-xl border border-line bg-white p-3 sm:px-4"
        >
          <span class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-mist-1 text-ink-soft">
            <Icon :name="styleFor(row.action).icon" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-ink">{{ row.summary || `${row.action} ${row.entity}` }}</p>
            <p class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-faint">
              <span class="font-bold text-ink-soft">{{ row.actorName || 'Unknown' }}</span>
              <span v-if="row.actorRole" class="badge badge-gray">{{ row.actorRole }}</span>
              <span>·</span>
              <span>{{ stamp(row.createdAt) }}</span>
            </p>
          </div>
          <span class="badge shrink-0" :class="styleFor(row.action).badge">{{ row.entity }}</span>
        </li>
      </ol>

      <AdminEmptyState
        v-else
        icon="lucide:history"
        :title="filtered ? 'Nothing matches those filters' : 'No activity recorded yet'"
        :body="filtered ? 'Try widening the search.' : 'Actions taken in the console from now on will appear here.'"
      />

      <div v-if="data?.hasMore" class="mt-4 text-center">
        <button type="button" class="btn-secondary !py-2 text-sm" @click="limit += 100">
          <Icon name="lucide:chevron-down" /> Load more
        </button>
      </div>
    </AdminPanel>
  </div>
</template>
