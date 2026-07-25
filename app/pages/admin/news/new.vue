<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const saving = ref(false)
const toast = useToast()

async function create(data: any) {
  saving.value = true
  try {
    const row = await $fetch<{ id: number }>('/api/admin/news', { method: 'POST', body: data })
    toast.success('Article created')
    await navigateTo(`/admin/news/${row.id}`)
  } catch (e: any) {
    toast.error('Could not create the article', e?.data?.statusMessage ?? 'Check the fields and try again.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <AdminPageHeader
      title="New article"
      subtitle="Draft it now, publish when it is ready."
      icon="lucide:pen-line"
      back-to="/admin/news"
      back-label="News"
    />

    <div class="surface fade-up stagger-1 p-5 sm:p-6">
      <AdminNewsForm :saving="saving" @submit="create" />
    </div>
  </div>
</template>
