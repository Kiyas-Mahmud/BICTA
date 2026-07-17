<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const saving = ref(false)

async function create(data: any) {
  saving.value = true
  try {
    const row = await $fetch<{ id: number }>('/api/admin/events', { method: 'POST', body: data })
    await navigateTo(`/admin/events/${row.id}`)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <NuxtLink to="/admin/events" class="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-ink-faint transition-colors hover:text-ink">
      <Icon name="lucide:arrow-left" /> Events
    </NuxtLink>
    <h1 class="admin-h1">New event</h1>
    <p class="admin-sub">Create a yearly edition. You can add competitions after saving.</p>
    <div class="admin-panel mt-6">
      <AdminEventForm :saving="saving" @submit="create" />
    </div>
  </div>
</template>
