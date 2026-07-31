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

    <div class="surface fade-up stagger-2 p-5 sm:p-6">
      <AdminCollection
        title="Application form"
        subtitle="Custom fields teams fill out when registering for this competition."
        icon="lucide:list-checks"
        endpoint="/api/admin/application-fields"
        :query="{ competitionId: comp.id }"
        :defaults="{ competitionId: comp.id }"
        new-label="Add field"
        flush
        :fields="[
          { key: 'label', label: 'Field label', type: 'text', colSpan: 2 },
          { key: 'helpText', label: 'Help text', type: 'textarea', colSpan: 2 },
          { key: 'fieldType', label: 'Type', type: 'select', options: [
              { value: 'text', label: 'Text answer' }, { value: 'file', label: 'File upload' } ] },
          { key: 'required', label: 'Required', type: 'toggle' },
          { key: 'sortOrder', label: 'Order', type: 'number' },
        ]"
        :columns="[{ key: 'label', label: 'Field' }, { key: 'fieldType', label: 'Type' }, { key: 'required', label: 'Required' }]"
        empty-text="No custom fields yet — applicants only see the standard registration form."
      />
    </div>
  </div>
</template>
