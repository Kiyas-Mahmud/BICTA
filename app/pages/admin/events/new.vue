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
    <h1 class="text-2xl font-bold tracking-tight">New event</h1>
    <div class="mt-6 rounded-xl border border-line bg-white p-6">
      <AdminEventForm :saving="saving" @submit="create" />
    </div>
  </div>
</template>
