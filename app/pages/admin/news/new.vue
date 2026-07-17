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
    <NuxtLink to="/admin/news" class="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-ink-faint transition-colors hover:text-ink">
      <Icon name="lucide:arrow-left" /> News
    </NuxtLink>
    <h1 class="admin-h1">New article</h1>
    <p class="admin-sub">Draft it, then publish when ready.</p>
    <div class="admin-panel mt-6">
      <AdminNewsForm :saving="saving" @submit="create" />
    </div>
  </div>
</template>
