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
    <NuxtLink :to="`/admin/events/${eventId}`" class="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-ink-faint transition-colors hover:text-ink">
      <Icon name="lucide:arrow-left" /> Back to event
    </NuxtLink>
    <h1 class="admin-h1">New competition</h1>
    <p class="admin-sub">Add a contest, its rules, registration window and prizes.</p>
    <div class="admin-panel mt-6">
      <AdminCompetitionForm :event-id="eventId" :saving="saving" @submit="create" />
    </div>
  </div>
</template>
