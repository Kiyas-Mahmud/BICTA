<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const route = useRoute()
const id = route.params.id
const { data: article, refresh } = await useFetch(`/api/admin/news/${id}`)

const saving = ref(false)
const savedAt = ref('')

async function save(data: any) {
  saving.value = true
  try {
    await $fetch(`/api/admin/news/${id}`, { method: 'PUT', body: data })
    savedAt.value = new Date().toLocaleTimeString()
    await refresh()
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div v-if="article">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold tracking-tight">Edit article</h1>
      <span v-if="savedAt" class="text-sm text-ink-faint">Saved {{ savedAt }}</span>
    </div>
    <div class="mt-6 rounded-xl border border-line bg-white p-6">
      <AdminNewsForm :key="article.updatedAt" :initial="article" :saving="saving" @submit="save" />
    </div>
  </div>
</template>
