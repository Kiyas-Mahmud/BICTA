<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const route = useRoute()
const id = route.params.id
const { data: ev, refresh } = await useFetch(`/api/admin/events/${id}`)

const saving = ref(false)
const savedAt = ref('')
const toast = useToast()
const { confirm } = useConfirm()

async function save(data: any) {
  saving.value = true
  try {
    await $fetch(`/api/admin/events/${id}`, { method: 'PUT', body: data })
    savedAt.value = new Date().toLocaleTimeString()
    await Promise.all([refresh(), refreshAdminStats()])
    toast.success('Event saved')
  } catch (e: any) {
    toast.error('Could not save the event', e?.data?.statusMessage ?? 'Check the fields and try again.')
  } finally {
    saving.value = false
  }
}

async function removeCompetition(compId: number, name: string) {
  const ok = await confirm({
    title: `Delete competition "${name}"?`,
    body: 'Its prizes and registrations are removed too. This cannot be undone.',
    confirmLabel: 'Delete competition',
  })
  if (!ok) return
  await $fetch(`/api/admin/competitions/${compId}`, { method: 'DELETE' })
  await Promise.all([refresh(), refreshAdminStats()])
  toast.success(`${name} deleted`)
}
</script>

<template>
  <div v-if="ev" class="space-y-6">
    <AdminPageHeader
      :title="ev.title"
      :subtitle="`${ev.year} edition · ${ev.competitions?.length ?? 0} competitions`"
      icon="lucide:calendar-days"
      back-to="/admin/events"
      back-label="Events"
    >
      <template #badge>
        <AdminStatusBadge :status="ev.status" />
        <span v-if="ev.isCurrent" class="status status-brand">Current</span>
      </template>
      <template #actions>
        <Transition enter-active-class="transition duration-200" enter-from-class="opacity-0">
          <span v-if="savedAt" class="inline-flex items-center gap-1.5 text-sm font-semibold text-green-700">
            <Icon name="lucide:circle-check-big" /> Saved {{ savedAt }}
          </span>
        </Transition>
        <NuxtLink :to="`/admin/competitions/new?eventId=${ev.id}`" class="btn-secondary !py-2.5">
          <Icon name="lucide:plus" /> Add competition
        </NuxtLink>
      </template>
    </AdminPageHeader>

    <div class="surface fade-up stagger-1 p-5 sm:p-6">
      <AdminEventForm :key="ev.updatedAt" :initial="ev" :saving="saving" @submit="save" />
    </div>

    <AdminPanel title="Competitions" subtitle="Contests inside this event" icon="lucide:trophy" flush class="fade-up stagger-2">
      <template #actions>
        <NuxtLink :to="`/admin/competitions/new?eventId=${ev.id}`" class="btn-ghost !py-2 !text-xs">
          <Icon name="lucide:plus" /> Add competition
        </NuxtLink>
      </template>

      <div class="table-wrap">
        <table class="console-table min-w-[40rem]">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Type</th>
              <th scope="col">Registration</th>
              <th scope="col">Deadline</th>
              <th scope="col" class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="comp in ev.competitions" :key="comp.id">
              <td>
                <NuxtLink :to="`/admin/competitions/${comp.id}`" class="font-semibold text-ink hover:text-brand-700">{{ comp.name }}</NuxtLink>
              </td>
              <td class="text-ink-soft">{{ comp.type || '—' }}</td>
              <td>
                <span class="status" :class="comp.registrationOpen ? 'status-ok' : 'status-neutral'">
                  {{ comp.registrationOpen ? 'Open' : 'Closed' }}
                </span>
              </td>
              <td class="whitespace-nowrap text-ink-soft">{{ comp.registrationDeadline ?? '—' }}</td>
              <td>
                <div class="row-actions">
                  <NuxtLink :to="`/admin/competitions/${comp.id}`" class="icon-btn-sm icon-btn-brand" :aria-label="`Edit ${comp.name}`" title="Edit">
                    <Icon name="lucide:pencil" />
                  </NuxtLink>
                  <button class="icon-btn-sm icon-btn-danger" :aria-label="`Delete ${comp.name}`" title="Delete" @click="removeCompetition(comp.id, comp.name)">
                    <Icon name="lucide:trash-2" />
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!ev.competitions?.length">
              <td colspan="5" class="!p-0">
                <AdminEmptyState icon="lucide:trophy" title="No competitions yet" body="Add the contests that make up this edition — each one gets its own rules, prizes and registration window.">
                  <template #action>
                    <NuxtLink :to="`/admin/competitions/new?eventId=${ev.id}`" class="btn-primary !py-2.5">Add competition</NuxtLink>
                  </template>
                </AdminEmptyState>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </AdminPanel>
  </div>
</template>
