<script setup lang="ts">
import type { Field } from '~/components/admin/Collection.vue'
definePageMeta({ layout: 'admin', middleware: 'admin' })

// Milestones belong to one edition, so this screen always works on a chosen
// event rather than silently assuming the current one.
const { eventOptions, eventId, query, activeEvent } = useEventFilter()

const fields: Field[] = [
  { key: 'label', label: 'Label', placeholder: 'Registration closes' },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'note', label: 'Note', type: 'textarea', colSpan: 2 },
  { key: 'sortOrder', label: 'Sort order', type: 'number', hint: 'Lower numbers appear first.' },
]
const columns = [
  { key: 'label', label: 'Label' },
  { key: 'date', label: 'Date' },
  { key: 'sortOrder', label: 'Order' },
]
const defaults = computed(() => ({ eventId: eventId.value || undefined }))
</script>

<template>
  <div class="space-y-4">
    <AdminPageHeader
      title="Important Dates"
      :subtitle="activeEvent ? `Milestones shown in the public timeline for ${activeEvent.title}.` : 'Milestones shown in the public timeline.'"
      icon="lucide:milestone"
    />

    <AdminEventFilter v-model="eventId" :options="eventOptions" hint="Each edition keeps its own set of milestones." />

    <AdminCollection
      :key="String(eventId)"
      flush
      title="Milestones"
      subtitle="Registration opening, deadlines, the ceremony — the dates participants plan around."
      new-label="New milestone"
      endpoint="/api/admin/timeline"
      :query="query"
      :fields="fields"
      :columns="columns"
      :defaults="defaults"
      empty-text="No milestones for this edition yet."
    />
  </div>
</template>
