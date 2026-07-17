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
    <NuxtLink to="/admin/news" class="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-ink-faint transition-colors hover:text-ink">
      <Icon name="lucide:arrow-left" /> News
    </NuxtLink>
    <div class="admin-head">
      <div class="flex items-center gap-3">
        <h1 class="admin-h1">Edit article</h1>
        <span class="rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize" :class="article.status === 'published' ? 'bg-green-50 text-green-700' : 'bg-mist-2 text-ink-soft'">{{ article.status }}</span>
      </div>
      <Transition enter-active-class="transition duration-200" enter-from-class="opacity-0">
        <span v-if="savedAt" class="inline-flex items-center gap-1 text-sm text-green-700"><Icon name="lucide:check-circle" /> Saved {{ savedAt }}</span>
      </Transition>
    </div>
    <div class="admin-panel mt-6">
      <AdminNewsForm :key="article.updatedAt" :initial="article" :saving="saving" @submit="save" />
    </div>
  </div>
</template>
