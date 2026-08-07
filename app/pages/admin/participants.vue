<script setup lang="ts">
// People, not entries: one row per participant account, with every team they
// belong to. The Registrations screen lists team entries instead.
definePageMeta({ layout: 'admin', middleware: 'admin' })

interface TeamRef {
  registrationId: number
  teamName: string | null
  role: 'leader' | 'member'
  competitionId: number
  competitionName: string
  eventTitle: string
  registrationStatus: 'pending' | 'confirmed' | 'rejected'
}
interface Participant {
  id: number
  fullName: string
  email: string
  phone: string | null
  status: 'invited' | 'pending' | 'active'
  inviteExpired: boolean
  institution: string
  createdAt: string
  teams: TeamRef[]
}
interface Payload {
  rows: Participant[]
  totals: { all: number; active: number; invited: number; expired: number }
}

const filters = reactive({ q: '', status: 'all' as 'all' | 'active' | 'invited', competitionId: '' })

const { data: tree } = await useFetch('/api/admin/event-tree', { key: 'admin-event-tree' })
const allCompetitions = computed(() =>
  (tree.value ?? []).flatMap((e: any) => e.competitions.map((c: any) => ({ ...c, eventTitle: e.title }))),
)

const { data, pending } = await useFetch<Payload>('/api/admin/participants', {
  query: computed(() => ({
    q: filters.q || undefined,
    status: filters.status,
    competitionId: filters.competitionId || undefined,
  })),
})

function stateOf(p: Participant) {
  if (p.status === 'active') return { label: 'Registered', cls: 'badge badge-green' }
  if (p.inviteExpired) return { label: 'Invite expired', cls: 'badge badge-gray' }
  return { label: 'Invitation pending', cls: 'badge badge-amber' }
}

const anyFilter = computed(() => Boolean(filters.q || filters.status !== 'all' || filters.competitionId))
function reset() {
  Object.assign(filters, { q: '', status: 'all', competitionId: '' })
}

useSeoMeta({ title: 'Participants', robots: 'noindex' })
</script>

<template>
  <div class="space-y-6">
    <AdminPageHeader
      title="Participants"
      subtitle="Everyone with an account, and the teams they belong to."
      icon="lucide:users"
    >
      <template #badge>
        <span v-if="data" class="status status-neutral">{{ data.totals.all }} people</span>
      </template>
    </AdminPageHeader>

    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <AdminStatCard v-if="data" label="Registered" :value="data.totals.active" icon="lucide:user-check" tone="green" />
      <AdminStatCard v-if="data" label="Invitation pending" :value="data.totals.invited" icon="lucide:mail" tone="amber" />
      <AdminStatCard v-if="data" label="Invite expired" :value="data.totals.expired" icon="lucide:clock" tone="ink" />
      <AdminStatCard v-if="data" label="Total" :value="data.totals.all" icon="lucide:users" tone="brand" />
    </div>

    <AdminPanel title="Filter" icon="lucide:filter" class="fade-up">
      <div class="grid gap-3 sm:grid-cols-3">
        <div>
          <label class="label" for="p-q">Search</label>
          <input id="p-q" v-model="filters.q" class="input" placeholder="Name or email" />
        </div>
        <div>
          <label class="label" for="p-status">Status</label>
          <select id="p-status" v-model="filters.status" class="input">
            <option value="all">All</option>
            <option value="active">Registered</option>
            <option value="invited">Not yet registered</option>
          </select>
        </div>
        <div>
          <label class="label" for="p-comp">Competition</label>
          <select id="p-comp" v-model="filters.competitionId" class="input">
            <option value="">Any competition</option>
            <option v-for="c in allCompetitions" :key="c.id" :value="String(c.id)">{{ c.eventTitle }} · {{ c.name }}</option>
          </select>
        </div>
      </div>
      <div v-if="anyFilter" class="mt-3">
        <button type="button" class="btn-secondary !py-2 text-sm" @click="reset"><Icon name="lucide:x" /> Clear filters</button>
      </div>
    </AdminPanel>

    <AdminPanel title="People" icon="lucide:list" class="fade-up stagger-1">
      <AdminSkeletonRows v-if="pending" :rows="6" />

      <ul v-else-if="data?.rows.length" class="space-y-2">
        <li v-for="p in data.rows" :key="p.id" class="rounded-xl border border-line bg-white p-3 sm:px-4">
          <div class="flex items-start gap-3">
            <AdminAvatar :name="p.fullName" />
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-bold text-ink">{{ p.fullName }}</p>
              <p class="truncate text-xs text-ink-faint">
                {{ p.email }}<template v-if="p.phone"> · {{ p.phone }}</template>
                <template v-if="p.institution"> · {{ p.institution }}</template>
              </p>
            </div>
            <span :class="stateOf(p).cls" class="shrink-0">{{ stateOf(p).label }}</span>
          </div>

          <ul v-if="p.teams.length" class="mt-2.5 flex flex-wrap gap-1.5 pl-0 sm:pl-12">
            <li
              v-for="t in p.teams"
              :key="t.registrationId"
              class="inline-flex items-center gap-1.5 rounded-lg bg-mist-1 px-2 py-1 text-xs text-ink-soft"
            >
              <Icon :name="t.role === 'leader' ? 'lucide:crown' : 'lucide:user'" class="text-ink-faint" />
              <span class="font-semibold text-ink">{{ t.teamName || 'Solo entry' }}</span>
              <span>· {{ t.competitionName }}</span>
              <span
                class="badge"
                :class="t.registrationStatus === 'confirmed' ? 'badge-green' : t.registrationStatus === 'rejected' ? 'badge-orange' : 'badge-amber'"
              >{{ t.registrationStatus }}</span>
            </li>
          </ul>
          <p v-else class="mt-2 pl-0 text-xs text-ink-faint sm:pl-12">Not on any team yet.</p>
        </li>
      </ul>

      <AdminEmptyState
        v-else
        icon="lucide:users"
        :title="anyFilter ? 'Nobody matches those filters' : 'No participants yet'"
        :body="anyFilter ? 'Try widening the search.' : 'Accounts appear here as soon as someone registers for a competition.'"
      />
    </AdminPanel>
  </div>
</template>
