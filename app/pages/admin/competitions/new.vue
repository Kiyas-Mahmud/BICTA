<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const route = useRoute()
const eventId = Number(route.query.eventId)
if (!Number.isInteger(eventId) || eventId <= 0) {
  await navigateTo('/admin/events')
}

const saving = ref(false)
const toast = useToast()

async function create(data: any) {
  saving.value = true
  try {
    await $fetch('/api/admin/competitions', { method: 'POST', body: data })
    toast.success('Competition created')
    await navigateTo(`/admin/events/${eventId}`)
  } catch (e: any) {
    toast.error('Could not create the competition', e?.data?.statusMessage ?? 'Check the fields and try again.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <AdminPageHeader
      title="New competition"
      subtitle="Add a contest with its rules, registration window and prizes."
      icon="lucide:trophy"
      :back-to="`/admin/events/${eventId}`"
      back-label="Back to event"
    />

    <div class="surface fade-up stagger-1 p-5 sm:p-6">
      <AdminCompetitionForm :event-id="eventId" :saving="saving" @submit="create" />
    </div>
  </div>
</template>
