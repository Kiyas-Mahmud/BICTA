<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const route = useRoute()
const eventId = Number(route.query.eventId)
if (!Number.isInteger(eventId) || eventId <= 0) {
  await navigateTo('/admin/events')
}

const saving = ref(false)

async function create(data: any) {
  saving.value = true
  try {
    await $fetch('/api/admin/competitions', { method: 'POST', body: data })
    await navigateTo(`/admin/events/${eventId}`)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold tracking-tight">New competition</h1>
    <div class="mt-6 rounded-xl border border-line bg-white p-6">
      <AdminCompetitionForm :event-id="eventId" :saving="saving" @submit="create" />
    </div>
  </div>
</template>
