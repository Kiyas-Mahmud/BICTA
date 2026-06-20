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
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">{{ comp.name }}</h1>
        <NuxtLink :to="`/admin/events/${comp.eventId}`" class="inline-flex items-center gap-1 text-sm text-accent hover:underline">
          <Icon name="lucide:arrow-left" /> Back to event
        </NuxtLink>
      </div>
      <span v-if="savedAt" class="text-sm text-ink-faint">Saved {{ savedAt }}</span>
    </div>

    <div class="mt-6 rounded-xl border border-line bg-white p-6">
      <AdminCompetitionForm :key="String(comp.id)" :initial="comp" :event-id="comp.eventId" :saving="saving" @submit="save" />
    </div>
  </div>
</template>
