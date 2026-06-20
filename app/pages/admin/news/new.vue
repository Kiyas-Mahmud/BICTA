<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const saving = ref(false)

async function create(data: any) {
  saving.value = true
  try {
    const row = await $fetch<{ id: number }>('/api/admin/news', { method: 'POST', body: data })
    await navigateTo(`/admin/news/${row.id}`)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold tracking-tight">New article</h1>
    <div class="mt-6 rounded-xl border border-line bg-white p-6">
      <AdminNewsForm :saving="saving" @submit="create" />
    </div>
  </div>
</template>
