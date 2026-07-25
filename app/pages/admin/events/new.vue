<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const saving = ref(false)
const toast = useToast()

async function create(data: any) {
  saving.value = true
  try {
    const row = await $fetch<{ id: number }>('/api/admin/events', { method: 'POST', body: data })
    toast.success('Event created', 'Add its competitions next.')
    await navigateTo(`/admin/events/${row.id}`)
  } catch (e: any) {
    toast.error('Could not create the event', e?.data?.statusMessage ?? 'Check the fields and try again.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <AdminPageHeader
      title="New event"
      subtitle="Create a yearly edition. Competitions, prizes and the gallery come after saving."
      icon="lucide:calendar-plus"
      back-to="/admin/events"
      back-label="Events"
    />

    <div class="surface fade-up stagger-1 p-5 sm:p-6">
      <AdminEventForm :saving="saving" @submit="create" />
    </div>
  </div>
</template>
