<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const competitionId = ref<number | ''>('')
const status = ref<'' | 'pending' | 'confirmed' | 'rejected'>('')

const query = computed(() => ({
  ...(competitionId.value ? { competitionId: competitionId.value } : {}),
  ...(status.value ? { status: status.value } : {}),
}))

const { data: rows, refresh } = await useFetch('/api/admin/registrations', { query })
const { data: events } = await useFetch('/api/admin/events')

// Flatten competitions for the filter dropdown.
const { data: allComps } = await useAsyncData('admin-comp-options', async () => {
  const evs = await $fetch('/api/admin/events')
  const detail = await Promise.all(evs.map((e: any) => $fetch(`/api/admin/events/${e.id}`)))
  return detail.flatMap((d: any) => d.competitions.map((c: any) => ({ id: c.id, label: `${c.name} (${d.year})` })))
})

const expanded = ref<number | null>(null)

async function setStatus(id: number, newStatus: string) {
  await $fetch(`/api/admin/registrations/${id}`, { method: 'PUT', body: { status: newStatus } })
  await refresh()
}

const exportUrl = computed(() =>
  competitionId.value ? `/api/admin/registrations/export?competitionId=${competitionId.value}` : '/api/admin/registrations/export',
)

// Quick counts for the summary strip (respect current filter).
const counts = computed(() => {
  const list = rows.value ?? []
  return {
    total: list.length,
    pending: list.filter((r: any) => r.status === 'pending').length,
    confirmed: list.filter((r: any) => r.status === 'confirmed').length,
    rejected: list.filter((r: any) => r.status === 'rejected').length,
  }
})

function initials(name: string) {
  return (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
}
const statusPill: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  confirmed: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-600',
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-ink">Registrations</h1>
        <p class="mt-0.5 text-sm text-ink-soft">Review, confirm and export participant sign-ups.</p>
      </div>
      <a :href="exportUrl" class="btn-secondary !py-2.5" download><Icon name="lucide:download" /> Export CSV</a>
    </div>

    <!-- summary strip -->
    <div class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div class="rounded-xl border border-line bg-white p-4 shadow-soft">
        <p class="text-[0.66rem] font-bold uppercase tracking-wider text-ink-faint">Total</p>
        <p class="mt-1 text-2xl font-extrabold text-ink">{{ counts.total }}</p>
      </div>
      <div class="rounded-xl border border-line bg-white p-4 shadow-soft">
        <p class="text-[0.66rem] font-bold uppercase tracking-wider text-amber-700">Pending</p>
        <p class="mt-1 text-2xl font-extrabold text-ink">{{ counts.pending }}</p>
      </div>
      <div class="rounded-xl border border-line bg-white p-4 shadow-soft">
        <p class="text-[0.66rem] font-bold uppercase tracking-wider text-green-700">Confirmed</p>
        <p class="mt-1 text-2xl font-extrabold text-ink">{{ counts.confirmed }}</p>
      </div>
      <div class="rounded-xl border border-line bg-white p-4 shadow-soft">
        <p class="text-[0.66rem] font-bold uppercase tracking-wider text-red-600">Rejected</p>
        <p class="mt-1 text-2xl font-extrabold text-ink">{{ counts.rejected }}</p>
      </div>
    </div>

    <!-- filters -->
    <div class="mt-5 flex flex-wrap items-center gap-3">
      <div class="relative">
        <Icon name="lucide:filter" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
        <select v-model="competitionId" class="input max-w-xs !pl-9">
          <option value="">All competitions</option>
          <option v-for="c in allComps" :key="c.id" :value="c.id">{{ c.label }}</option>
        </select>
      </div>
      <select v-model="status" class="input max-w-[11rem]">
        <option value="">All statuses</option>
        <option value="pending">Pending</option>
        <option value="confirmed">Confirmed</option>
        <option value="rejected">Rejected</option>
      </select>
    </div>

    <!-- table -->
    <div class="mt-5 overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr class="border-b border-line bg-mist-1 text-[0.68rem] uppercase tracking-wider text-ink-faint">
              <th class="px-5 py-3 font-bold">Participant</th>
              <th class="px-5 py-3 font-bold">Competition</th>
              <th class="px-5 py-3 font-bold">Team</th>
              <th class="px-5 py-3 font-bold">Status</th>
              <th class="px-5 py-3 font-bold">Registered</th>
              <th class="px-5 py-3 text-right font-bold">Actions</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="r in rows" :key="r.id">
              <tr class="border-b border-line transition-colors last:border-0 hover:bg-mist-1">
                <td class="px-5 py-3">
                  <button class="flex items-center gap-3 text-left" @click="expanded = expanded === r.id ? null : r.id">
                    <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-800">{{ initials(r.fullName) }}</span>
                    <div class="min-w-0">
                      <p class="truncate font-semibold text-ink hover:text-brand-700">{{ r.fullName }}</p>
                      <p class="truncate text-xs text-ink-faint">{{ r.email }}</p>
                    </div>
                    <Icon name="lucide:chevron-down" class="text-ink-faint transition-transform" :class="{ 'rotate-180': expanded === r.id }" />
                  </button>
                </td>
                <td class="px-5 py-3 text-ink-soft">{{ r.competitionName }}</td>
                <td class="px-5 py-3 text-ink-soft">{{ r.teamName ?? '—' }}</td>
                <td class="px-5 py-3">
                  <span class="rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize" :class="statusPill[r.status]">{{ r.status }}</span>
                </td>
                <td class="px-5 py-3 text-ink-soft">{{ new Date(r.createdAt + 'Z').toLocaleDateString() }}</td>
                <td class="px-5 py-3">
                  <div class="flex items-center justify-end gap-1">
                    <button v-if="r.status !== 'confirmed'" class="flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-green-50 hover:text-green-700" aria-label="Confirm" @click="setStatus(r.id, 'confirmed')">
                      <Icon name="lucide:check" />
                    </button>
                    <button v-if="r.status !== 'rejected'" class="flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-red-50 hover:text-red-600" aria-label="Reject" @click="setStatus(r.id, 'rejected')">
                      <Icon name="lucide:x" />
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="expanded === r.id" class="border-b border-line bg-mist-1 last:border-0">
                <td colspan="6" class="px-5 py-4 text-sm">
                  <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <p><span class="text-xs font-semibold uppercase tracking-wider text-ink-faint">Phone</span><br />{{ r.phone }}</p>
                    <p><span class="text-xs font-semibold uppercase tracking-wider text-ink-faint">Institution</span><br />{{ r.institution || '—' }}</p>
                    <p class="col-span-2"><span class="text-xs font-semibold uppercase tracking-wider text-ink-faint">Notes</span><br />{{ r.notes || '—' }}</p>
                  </div>
                  <div v-if="r.teamMembers?.length" class="mt-3">
                    <p class="text-xs font-semibold uppercase tracking-wider text-ink-faint">Team members</p>
                    <ul class="mt-1 flex flex-wrap gap-2">
                      <li v-for="(m, i) in r.teamMembers" :key="i" class="rounded-lg bg-white px-2.5 py-1 text-xs text-ink-soft ring-1 ring-line">{{ m.name }} · {{ m.email }}</li>
                    </ul>
                  </div>
                </td>
              </tr>
            </template>
            <tr v-if="!rows?.length">
              <td colspan="6" class="px-5 py-12 text-center">
                <div class="flex flex-col items-center gap-2 text-ink-faint">
                  <Icon name="lucide:clipboard-list" class="text-3xl" />
                  <p class="text-sm">No registrations match these filters.</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
