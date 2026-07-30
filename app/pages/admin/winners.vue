<script setup lang="ts">
import type { Field } from '~/components/admin/Collection.vue'
definePageMeta({ layout: 'admin', middleware: 'admin' })

// Winners belong to the edition they won. "All events" is offered because the
// public hall of fame spans every year.
const { eventOptions, eventId, query, activeEvent } = useEventFilter({ allowAll: true })

const fields = computed<Field[]>(() => [
  { key: 'name', label: 'Name / team' },
  { key: 'position', label: 'Position', placeholder: 'Champion' },
  { key: 'competitionName', label: 'Competition' },
  {
    key: 'eventId',
    label: 'Event',
    type: 'select',
    options: [{ value: null, label: 'Not linked to an edition' }, ...eventOptions.value.filter((o) => o.value !== '')],
    hint: 'Used to filter this list.',
  },
  { key: 'year', label: 'Year', type: 'number' },
  { key: 'projectTitle', label: 'Project title' },
  { key: 'photoUrl', label: 'Photo', type: 'image' },
  { key: 'sortOrder', label: 'Sort order', type: 'number', hint: 'Lower numbers appear first.' },
])
const columns = [
  { key: 'name', label: 'Name' },
  { key: 'competitionName', label: 'Competition' },
  { key: 'year', label: 'Year' },
  { key: 'sortOrder', label: 'Order' },
]
const defaults = computed(() => ({ eventId: eventId.value || null }))
</script>

<template>
  <div class="space-y-4">
    <AdminPageHeader
      title="Previous Winners"
      :subtitle="activeEvent ? `Champions from ${activeEvent.title}.` : 'Past champions shown in the winners section.'"
      icon="lucide:trophy"
    />

    <AdminEventFilter v-model="eventId" :options="eventOptions" hint="Newest edition first." />

    <AdminCollection
      :key="String(eventId)"
      flush
      title="Winners"
      subtitle="Past champions shown in the hall of fame."
      new-label="New winner"
      endpoint="/api/admin/winners"
      :query="query"
      :fields="fields"
      :columns="columns"
      :defaults="defaults"
      empty-text="No winners recorded for this selection yet."
    />
  </div>
</template>
