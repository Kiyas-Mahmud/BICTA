<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const competitionId = ref<number | ''>('')
const status = ref<'' | 'pending' | 'confirmed' | 'rejected'>('')

const query = computed(() => ({
  ...(competitionId.value ? { competitionId: competitionId.value } : {}),
  ...(status.value ? { status: status.value } : {}),
}))

const { data: rows, refresh, pending } = await useFetch('/api/admin/registrations', { query })

// Flatten competitions for the filter dropdown.
const { data: allComps } = await useAsyncData('admin-comp-options', async () => {
  const evs = await $fetch('/api/admin/events')
  const detail = await Promise.all(evs.map((e: any) => $fetch(`/api/admin/events/${e.id}`)))
  return detail.flatMap((d: any) => d.competitions.map((c: any) => ({ id: c.id, label: `${c.name} (${d.year})` })))
})

const expanded = ref<number | null>(null)
const busyId = ref<number | null>(null)
const toast = useToast()

async function setStatus(id: number, newStatus: string, name: string) {
  busyId.value = id
  try {
    await $fetch(`/api/admin/registrations/${id}`, { method: 'PUT', body: { status: newStatus } })
    await refresh()
    toast.success(`${name} marked ${newStatus}`)
  } catch {
    toast.error('Could not update that registration', 'Check your connection and try again.')
  } finally {
    busyId.value = null
  }
}

const exportUrl = computed(() =>
  competitionId.value ? `/api/admin/registrations/export?competitionId=${competitionId.value}` : '/api/admin/registrations/export',
)

// Free-text narrowing over the rows already fetched — no extra API surface.
const search = ref('')
const visible = computed(() => {
  const q = search.value.trim().toLowerCase()
  const list = rows.value ?? []
  if (!q) return list
  return list.filter((r: any) =>
    [r.fullName, r.email, r.teamName, r.competitionName, r.institution]
      .filter(Boolean)
      .some((v: string) => String(v).toLowerCase().includes(q)),
  )
})

// Quick counts for the summary strip (respect the competition filter only, so
// the tiles can also act as the status filter).
const counts = computed(() => {
  const list = rows.value ?? []
  return {
    total: list.length,
    pending: list.filter((r: any) => r.status === 'pending').length,
    confirmed: list.filter((r: any) => r.status === 'confirmed').length,
    rejected: list.filter((r: any) => r.status === 'rejected').length,
  }
})

const tiles = computed(() => [
  { key: '' as const, label: 'Showing', value: counts.value.total, tone: 'ink', icon: 'lucide:clipboard-list' },
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

const filtersActive = computed(() => Boolean(competitionId.value || status.value || search.value))
function clearFilters() {
  competitionId.value = ''
  status.value = ''
  search.value = ''
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
        <a :href="exportUrl" class="btn-secondary !py-2.5" download>
          <Icon name="lucide:download" /> Export CSV
        </a>
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

    <!-- filters -->
    <div class="toolbar fade-up stagger-2">
      <div class="relative min-w-[13rem] flex-1">
        <Icon name="lucide:search" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
        <label class="sr-only" for="reg-search">Search registrations</label>
        <input id="reg-search" v-model="search" type="search" class="input !pl-9" placeholder="Search name, email, team or institution" />
      </div>
      <div class="select-wrap">
        <Icon name="lucide:filter" />
        <label class="sr-only" for="reg-comp">Competition</label>
        <select id="reg-comp" v-model="competitionId" class="input w-full sm:w-56">
          <option value="">All competitions</option>
          <option v-for="c in allComps" :key="c.id" :value="c.id">{{ c.label }}</option>
        </select>
      </div>
      <label class="sr-only" for="reg-status">Status</label>
      <select id="reg-status" v-model="status" class="input w-full sm:w-40">
        <option value="">All statuses</option>
        <option value="pending">Pending</option>
        <option value="confirmed">Confirmed</option>
        <option value="rejected">Rejected</option>
      </select>
      <button v-if="filtersActive" type="button" class="btn-ghost !py-2" @click="clearFilters">
        <Icon name="lucide:x" /> Clear
      </button>
    </div>

    <section class="surface fade-up stagger-3 overflow-hidden">
      <AdminSkeletonRows v-if="pending" :rows="6" :cols="5" />

      <template v-else>
        <!-- mobile: stacked cards, one registration each -->
        <ul class="divide-y divide-line lg:hidden">
          <li v-for="r in visible" :key="r.id" class="p-4">
            <div class="flex items-start gap-3">
              <AdminAvatar :name="r.fullName" />
              <div class="min-w-0 flex-1">
                <div class="flex items-start justify-between gap-2">
                  <p class="truncate font-bold text-ink">{{ r.fullName }}</p>
                  <AdminStatusBadge :status="r.status" />
                </div>
                <p class="truncate text-xs text-ink-faint">{{ r.email }}</p>
                <p class="mt-1.5 text-xs text-ink-soft">
                  {{ r.competitionName }}<span v-if="r.teamName"> · {{ r.teamName }}</span>
                </p>
                <p class="mt-0.5 text-xs text-ink-faint">Registered {{ formatDay(r.createdAt) }}</p>

                <div class="mt-3 flex flex-wrap gap-2">
                  <button
                    v-if="r.status !== 'confirmed'"
                    class="btn-ghost !py-2 !text-xs"
                    :disabled="busyId === r.id"
                    @click="setStatus(r.id, 'confirmed', r.fullName)"
                  >
                    <Icon name="lucide:check" class="text-green-700" /> Confirm
                  </button>
                  <button
                    v-if="r.status !== 'rejected'"
                    class="btn-ghost !py-2 !text-xs"
                    :disabled="busyId === r.id"
                    @click="setStatus(r.id, 'rejected', r.fullName)"
                  >
                    <Icon name="lucide:x" class="text-red-600" /> Reject
                  </button>
                  <button class="btn-ghost !py-2 !text-xs" @click="expanded = expanded === r.id ? null : r.id">
                    <Icon name="lucide:chevron-down" :class="{ 'rotate-180': expanded === r.id }" class="transition-transform" />
                    Details
                  </button>
                </div>

                <Transition name="row">
                  <dl v-if="expanded === r.id" class="mt-3 space-y-2 rounded-xl bg-mist-1 p-3 text-sm">
                    <div><dt class="console-label">Phone</dt><dd class="text-ink-soft">{{ r.phone }}</dd></div>
                    <div><dt class="console-label">Institution</dt><dd class="text-ink-soft">{{ r.institution || '—' }}</dd></div>
                    <div><dt class="console-label">Notes</dt><dd class="whitespace-pre-wrap text-ink-soft">{{ r.notes || '—' }}</dd></div>
                    <div v-if="r.teamMembers?.length">
                      <dt class="console-label">Team members</dt>
                      <dd class="mt-1 flex flex-wrap gap-1.5">
                        <span v-for="(m, i) in r.teamMembers" :key="i" class="rounded-lg bg-white px-2 py-1 text-xs text-ink-soft ring-1 ring-line">
                          {{ m.name }} · {{ m.email }}
                        </span>
                      </dd>
                    </div>
                  </dl>
                </Transition>
              </div>
            </div>
          </li>
          <li v-if="!visible.length">
            <AdminEmptyState
              icon="lucide:clipboard-list"
              :title="filtersActive ? 'No matches' : 'No registrations yet'"
              :body="filtersActive ? 'Try a different filter or clear them all.' : 'Sign-ups from the public form appear here.'"
            >
              <template v-if="filtersActive" #action>
                <button class="btn-ghost" @click="clearFilters">Clear filters</button>
              </template>
            </AdminEmptyState>
          </li>
        </ul>

        <!-- desktop: full table -->
        <div class="table-wrap hidden lg:block">
          <table class="console-table">
            <thead>
              <tr>
                <th scope="col">Participant</th>
                <th scope="col">Competition</th>
                <th scope="col">Team</th>
                <th scope="col">Status</th>
                <th scope="col">Registered</th>
                <th scope="col" class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="r in visible" :key="r.id">
                <tr :class="expanded === r.id ? 'bg-brand-50' : ''">
                  <td>
                    <button
                      class="flex w-full items-center gap-3 rounded-lg text-left"
                      :aria-expanded="expanded === r.id"
                      @click="expanded = expanded === r.id ? null : r.id"
                    >
                      <AdminAvatar :name="r.fullName" />
                      <span class="min-w-0 flex-1">
                        <span class="block truncate font-semibold text-ink">{{ r.fullName }}</span>
                        <span class="block truncate text-xs text-ink-faint">{{ r.email }}</span>
                      </span>
                      <Icon
                        name="lucide:chevron-down"
                        class="shrink-0 text-ink-faint transition-transform duration-200"
                        :class="{ 'rotate-180': expanded === r.id }"
                      />
                    </button>
                  </td>
                  <td class="text-ink-soft">{{ r.competitionName }}</td>
                  <td class="text-ink-soft">{{ r.teamName ?? '—' }}</td>
                  <td><AdminStatusBadge :status="r.status" /></td>
                  <td class="whitespace-nowrap text-ink-soft">{{ formatDay(r.createdAt) }}</td>
                  <td>
                    <div class="row-actions">
                      <button
                        v-if="r.status !== 'confirmed'"
                        class="icon-btn-sm icon-btn-ok"
                        :disabled="busyId === r.id"
                        :aria-label="`Confirm ${r.fullName}`"
                        title="Confirm"
                        @click="setStatus(r.id, 'confirmed', r.fullName)"
                      >
                        <Icon :name="busyId === r.id ? 'lucide:loader-2' : 'lucide:check'" :class="{ 'animate-spin': busyId === r.id }" />
                      </button>
                      <button
                        v-if="r.status !== 'rejected'"
                        class="icon-btn-sm icon-btn-danger"
                        :disabled="busyId === r.id"
                        :aria-label="`Reject ${r.fullName}`"
                        title="Reject"
                        @click="setStatus(r.id, 'rejected', r.fullName)"
                      >
                        <Icon name="lucide:x" />
                      </button>
                    </div>
                  </td>
                </tr>
                <tr v-if="expanded === r.id" class="bg-brand-50">
                  <td colspan="6" class="!py-4">
                    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <div><p class="console-label">Phone</p><p class="mt-0.5 text-ink-soft">{{ r.phone }}</p></div>
                      <div><p class="console-label">Institution</p><p class="mt-0.5 text-ink-soft">{{ r.institution || '—' }}</p></div>
                      <div class="sm:col-span-2"><p class="console-label">Notes</p><p class="mt-0.5 whitespace-pre-wrap text-ink-soft">{{ r.notes || '—' }}</p></div>
                    </div>
                    <div v-if="r.teamMembers?.length" class="mt-4">
                      <p class="console-label">Team members</p>
                      <ul class="mt-1.5 flex flex-wrap gap-2">
                        <li v-for="(m, i) in r.teamMembers" :key="i" class="rounded-lg bg-white px-2.5 py-1 text-xs text-ink-soft ring-1 ring-line">
                          {{ m.name }} · {{ m.email }}
                        </li>
                      </ul>
                    </div>
                  </td>
                </tr>
              </template>
              <tr v-if="!visible.length">
                <td colspan="6" class="!p-0">
                  <AdminEmptyState
                    icon="lucide:clipboard-list"
                    :title="filtersActive ? 'No registrations match these filters' : 'No registrations yet'"
                    :body="filtersActive ? 'Try a different competition, status or search term.' : 'Sign-ups from the public form appear here as soon as they arrive.'"
                  >
                    <template v-if="filtersActive" #action>
                      <button class="btn-ghost" @click="clearFilters">Clear filters</button>
                    </template>
                  </AdminEmptyState>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </section>
  </div>
</template>
