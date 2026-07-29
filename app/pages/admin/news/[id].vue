<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const route = useRoute()
const id = route.params.id
const { data: article, refresh } = await useFetch(`/api/admin/news/${id}`)

const saving = ref(false)
const savedAt = ref('')
const toast = useToast()

async function save(data: any) {
  saving.value = true
  try {
    await $fetch(`/api/admin/news/${id}`, { method: 'PUT', body: data })
    savedAt.value = new Date().toLocaleTimeString()
    await Promise.all([refresh(), refreshAdminStats()])
    toast.success(data.status === 'published' ? 'Article published' : 'Draft saved')
  } catch (e: any) {
    toast.error('Could not save the article', e?.data?.statusMessage ?? 'Check the fields and try again.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div v-if="article" class="space-y-6">
    <AdminPageHeader
      title="Edit article"
      :subtitle="article.title"
      icon="lucide:pen-line"
      back-to="/admin/news"
      back-label="News"
    >
      <template #badge>
        <AdminStatusBadge :status="article.status" />
      </template>
      <template #actions>
        <Transition enter-active-class="transition duration-200" enter-from-class="opacity-0">
          <span v-if="savedAt" class="inline-flex items-center gap-1.5 text-sm font-semibold text-green-700">
            <Icon name="lucide:circle-check-big" /> Saved {{ savedAt }}
          </span>
        </Transition>
        <a
          v-if="article.status === 'published' && article.slug"
          :href="`/news/${article.slug}`"
          target="_blank"
          class="btn-secondary !py-2.5"
        >
          <Icon name="lucide:external-link" /> View live
        </a>
      </template>
    </AdminPageHeader>

    <div class="surface fade-up stagger-1 p-5 sm:p-6">
      <AdminNewsForm :key="article.updatedAt" :initial="article" :saving="saving" @submit="save" />
    </div>
  </div>
</template>
