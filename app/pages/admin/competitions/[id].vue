<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const route = useRoute()
const id = route.params.id
const { data: comp, refresh } = await useFetch(`/api/admin/competitions/${id}`)

const saving = ref(false)
const savedAt = ref('')

async function save(data: any) {
  saving.value = true
  try {
    await $fetch(`/api/admin/competitions/${id}`, { method: 'PUT', body: data })
    savedAt.value = new Date().toLocaleTimeString()
    await refresh()
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div v-if="comp">
    <NuxtLink :to="`/admin/events/${comp.eventId}`" class="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-ink-faint transition-colors hover:text-ink">
      <Icon name="lucide:arrow-left" /> Back to event
    </NuxtLink>
    <div class="admin-head">
      <h1 class="admin-h1">{{ comp.name }}</h1>
      <Transition enter-active-class="transition duration-200" enter-from-class="opacity-0">
        <span v-if="savedAt" class="inline-flex items-center gap-1 text-sm text-green-700"><Icon name="lucide:check-circle" /> Saved {{ savedAt }}</span>
      </Transition>
    </div>

    <div class="admin-panel mt-6">
      <AdminCompetitionForm :key="String(comp.id)" :initial="comp" :event-id="comp.eventId" :saving="saving" @submit="save" />
    </div>
  </div>
</template>
