<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const route = useRoute()
const id = route.params.id
const { data: ev, refresh } = await useFetch(`/api/admin/events/${id}`)

const saving = ref(false)
const savedAt = ref('')

async function save(data: any) {
  saving.value = true
  try {
    await $fetch(`/api/admin/events/${id}`, { method: 'PUT', body: data })
    savedAt.value = new Date().toLocaleTimeString()
    await refresh()
  } finally {
    saving.value = false
  }
}

async function removeCompetition(compId: number, name: string) {
  if (!window.confirm(`Delete competition "${name}"? Its prizes and registrations are removed too.`)) return
  await $fetch(`/api/admin/competitions/${compId}`, { method: 'DELETE' })
  await refresh()
}
</script>

<template>
  <div v-if="ev">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold tracking-tight">
        {{ ev.title }}
        <span v-if="ev.isCurrent" class="ml-2 rounded-full bg-accent-soft px-2.5 py-1 align-middle text-xs font-semibold text-accent">Current</span>
      </h1>
      <span v-if="savedAt" class="text-sm text-ink-faint">Saved {{ savedAt }}</span>
    </div>

    <div class="mt-6 rounded-xl border border-line bg-white p-6">
      <AdminEventForm :key="ev.updatedAt" :initial="ev" :saving="saving" @submit="save" />
    </div>

    <div class="mt-8">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-bold">Competitions</h2>
        <NuxtLink :to="`/admin/competitions/new?eventId=${ev.id}`" class="btn-primary"><Icon name="lucide:plus" /> Add competition</NuxtLink>
      </div>

      <div class="mt-4 overflow-hidden rounded-xl border border-line bg-white">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-line bg-neutral-50 text-xs uppercase text-ink-soft">
            <tr>
              <th class="px-4 py-3">Name</th>
              <th class="px-4 py-3">Type</th>
              <th class="px-4 py-3">Registration</th>
              <th class="px-4 py-3">Deadline</th>
              <th class="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="comp in ev.competitions" :key="comp.id" class="border-b border-line last:border-0">
              <td class="px-4 py-3 font-medium">
                <NuxtLink :to="`/admin/competitions/${comp.id}`" class="hover:text-accent">{{ comp.name }}</NuxtLink>
              </td>
              <td class="px-4 py-3 text-ink-soft">{{ comp.type || '—' }}</td>
              <td class="px-4 py-3">
                <span :class="comp.registrationOpen ? 'text-green-600' : 'text-ink-faint'" class="font-medium">
                  {{ comp.registrationOpen ? 'Open' : 'Closed' }}
                </span>
              </td>
              <td class="px-4 py-3 text-ink-soft">{{ comp.registrationDeadline ?? '—' }}</td>
              <td class="px-4 py-3 text-right">
                <NuxtLink :to="`/admin/competitions/${comp.id}`" class="mr-3 font-medium text-accent hover:underline">Edit</NuxtLink>
                <button class="font-medium text-red-600 hover:underline" @click="removeCompetition(comp.id, comp.name)">Delete</button>
              </td>
            </tr>
            <tr v-if="!ev.competitions?.length">
              <td colspan="5" class="px-4 py-8 text-center text-ink-faint">No competitions yet.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
