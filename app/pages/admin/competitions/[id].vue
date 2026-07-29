<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const route = useRoute()
const id = route.params.id
const { data: comp, refresh } = await useFetch(`/api/admin/competitions/${id}`)

const saving = ref(false)
const savedAt = ref('')
const toast = useToast()

async function save(data: any) {
  saving.value = true
  try {
    await $fetch(`/api/admin/competitions/${id}`, { method: 'PUT', body: data })
    savedAt.value = new Date().toLocaleTimeString()
    await Promise.all([refresh(), refreshAdminStats()])
    toast.success('Competition saved')
  } catch (e: any) {
    toast.error('Could not save the competition', e?.data?.statusMessage ?? 'Check the fields and try again.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div v-if="comp" class="space-y-6">
    <AdminPageHeader
      :title="comp.name"
      :subtitle="comp.type || 'Competition settings, rules and prizes'"
      icon="lucide:trophy"
      :back-to="`/admin/events/${comp.eventId}`"
      back-label="Back to event"
    >
      <template #badge>
        <span class="status" :class="comp.registrationOpen ? 'status-ok' : 'status-neutral'">
          {{ comp.registrationOpen ? 'Registration open' : 'Registration closed' }}
        </span>
      </template>
      <template #actions>
        <Transition enter-active-class="transition duration-200" enter-from-class="opacity-0">
          <span v-if="savedAt" class="inline-flex items-center gap-1.5 text-sm font-semibold text-green-700">
            <Icon name="lucide:circle-check-big" /> Saved {{ savedAt }}
          </span>
        </Transition>
      </template>
    </AdminPageHeader>

    <div class="surface fade-up stagger-1 p-5 sm:p-6">
      <AdminCompetitionForm :key="String(comp.id)" :initial="comp" :event-id="comp.eventId" :saving="saving" @submit="save" />
    </div>
  </div>
</template>
