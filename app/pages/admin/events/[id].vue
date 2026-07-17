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
    <NuxtLink to="/admin/events" class="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-ink-faint transition-colors hover:text-ink">
      <Icon name="lucide:arrow-left" /> Events
    </NuxtLink>
    <div class="admin-head">
      <div class="flex items-center gap-3">
        <h1 class="admin-h1">{{ ev.title }}</h1>
        <span v-if="ev.isCurrent" class="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-bold text-brand-700">
          <span class="h-1.5 w-1.5 rounded-full bg-brand-600" /> Current
        </span>
      </div>
      <Transition enter-active-class="transition duration-200" enter-from-class="opacity-0">
        <span v-if="savedAt" class="inline-flex items-center gap-1 text-sm text-green-700"><Icon name="lucide:check-circle" /> Saved {{ savedAt }}</span>
      </Transition>
    </div>

    <div class="admin-panel mt-6">
      <AdminEventForm :key="ev.updatedAt" :initial="ev" :saving="saving" @submit="save" />
    </div>

    <div class="mt-8">
      <div class="admin-head">
        <div>
          <h2 class="text-lg font-bold text-ink">Competitions</h2>
          <p class="admin-sub">Contests inside this event.</p>
        </div>
        <NuxtLink :to="`/admin/competitions/new?eventId=${ev.id}`" class="btn-primary"><Icon name="lucide:plus" /> Add competition</NuxtLink>
      </div>

      <div class="mt-4 overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
        <div class="overflow-x-auto">
          <table class="admin-table min-w-[640px]">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Registration</th>
                <th>Deadline</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="comp in ev.competitions" :key="comp.id">
                <td>
                  <NuxtLink :to="`/admin/competitions/${comp.id}`" class="font-semibold text-ink hover:text-brand-700">{{ comp.name }}</NuxtLink>
                </td>
                <td class="text-ink-soft">{{ comp.type || '—' }}</td>
                <td>
                  <span class="inline-flex items-center gap-1.5 text-xs font-semibold" :class="comp.registrationOpen ? 'text-green-700' : 'text-ink-faint'">
                    <span class="h-1.5 w-1.5 rounded-full" :class="comp.registrationOpen ? 'bg-green-500' : 'bg-ink-faint'" />
                    {{ comp.registrationOpen ? 'Open' : 'Closed' }}
                  </span>
                </td>
                <td class="text-ink-soft">{{ comp.registrationDeadline ?? '—' }}</td>
                <td>
                  <div class="flex items-center justify-end gap-1">
                    <NuxtLink :to="`/admin/competitions/${comp.id}`" class="icon-btn hover:bg-brand-50 hover:text-brand-700" aria-label="Edit"><Icon name="lucide:pencil" /></NuxtLink>
                    <button class="icon-btn hover:bg-red-50 hover:text-red-600" aria-label="Delete" @click="removeCompetition(comp.id, comp.name)"><Icon name="lucide:trash-2" /></button>
                  </div>
                </td>
              </tr>
              <tr v-if="!ev.competitions?.length">
                <td colspan="5" class="px-5 py-10 text-center">
                  <div class="flex flex-col items-center gap-2 text-ink-faint">
                    <Icon name="lucide:trophy" class="text-3xl" />
                    <p class="text-sm">No competitions yet.</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
