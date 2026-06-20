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
</script>

<template>
  <div>
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold tracking-tight">Registrations</h1>
      <a :href="exportUrl" class="btn-ghost" download><Icon name="lucide:download" /> Export CSV</a>
    </div>

    <div class="mt-4 flex flex-wrap gap-3">
      <select v-model="competitionId" class="input max-w-xs">
        <option value="">All competitions</option>
        <option v-for="c in allComps" :key="c.id" :value="c.id">{{ c.label }}</option>
      </select>
      <select v-model="status" class="input max-w-[10rem]">
        <option value="">All statuses</option>
        <option value="pending">Pending</option>
        <option value="confirmed">Confirmed</option>
        <option value="rejected">Rejected</option>
      </select>
    </div>

    <div class="mt-4 overflow-hidden rounded-xl border border-line bg-white">
      <table class="w-full text-left text-sm">
        <thead class="border-b border-line bg-neutral-50 text-xs uppercase text-ink-soft">
          <tr>
            <th class="px-4 py-3">Participant</th>
            <th class="px-4 py-3">Competition</th>
            <th class="px-4 py-3">Team</th>
            <th class="px-4 py-3">Status</th>
            <th class="px-4 py-3">Registered</th>
            <th class="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="r in rows" :key="r.id">
            <tr class="border-b border-line transition-colors last:border-0 hover:bg-neutral-50">
              <td class="px-4 py-3">
                <button class="font-medium hover:text-accent" @click="expanded = expanded === r.id ? null : r.id">
                  {{ r.fullName }}
                </button>
                <p class="text-xs text-ink-faint">{{ r.email }}</p>
              </td>
              <td class="px-4 py-3 text-ink-soft">{{ r.competitionName }}</td>
              <td class="px-4 py-3 text-ink-soft">{{ r.teamName ?? '—' }}</td>
              <td class="px-4 py-3">
                <span
                  class="rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize"
                  :class="{
                    'bg-amber-50 text-amber-700': r.status === 'pending',
                    'bg-green-50 text-green-700': r.status === 'confirmed',
                    'bg-red-50 text-red-700': r.status === 'rejected',
                  }"
                >
                  {{ r.status }}
                </span>
              </td>
              <td class="px-4 py-3 text-ink-soft">{{ new Date(r.createdAt + 'Z').toLocaleString() }}</td>
              <td class="px-4 py-3 text-right">
                <button v-if="r.status !== 'confirmed'" class="mr-3 font-medium text-green-600 hover:underline" @click="setStatus(r.id, 'confirmed')">Confirm</button>
                <button v-if="r.status !== 'rejected'" class="font-medium text-red-600 hover:underline" @click="setStatus(r.id, 'rejected')">Reject</button>
              </td>
            </tr>
            <tr v-if="expanded === r.id" class="border-b border-line bg-neutral-50 last:border-0">
              <td colspan="6" class="px-4 py-3 text-sm">
                <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <p><span class="font-medium">Phone:</span> {{ r.phone }}</p>
                  <p><span class="font-medium">Institution:</span> {{ r.institution || '—' }}</p>
                  <p class="col-span-2"><span class="font-medium">Notes:</span> {{ r.notes || '—' }}</p>
                </div>
                <div v-if="r.teamMembers?.length" class="mt-2">
                  <p class="font-medium">Team members:</p>
                  <ul class="ml-4 list-disc">
                    <li v-for="(m, i) in r.teamMembers" :key="i">{{ m.name }} — {{ m.email }}</li>
                  </ul>
                </div>
              </td>
            </tr>
          </template>
          <tr v-if="!rows?.length">
            <td colspan="6" class="px-4 py-10 text-center text-ink-faint">No registrations yet.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
