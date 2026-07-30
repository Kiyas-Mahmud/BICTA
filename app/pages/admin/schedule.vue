<script setup lang="ts">
import type { Field } from '~/components/admin/Collection.vue'
definePageMeta({ layout: 'admin', middleware: 'admin' })

// The hour-by-hour programme, separate from the milestone timeline. Sessions
// with no competition apply to the whole event.
const { data: tree } = await useFetch('/api/admin/event-tree', { key: 'admin-event-tree' })
const eventOptions = computed(() => (tree.value ?? []).map((e) => ({ value: e.id, label: `${e.title} (${e.year})` })))
const competitionOptions = computed(() => [
  { value: null, label: 'Whole event' },
  ...(tree.value ?? []).flatMap((e) => e.competitions.map((c) => ({ value: c.id, label: `${e.title} › ${c.name}` }))),
])
const defaults = computed(() => ({
  eventId: eventOptions.value[0]?.value ?? null,
  competitionId: null,
  published: true,
}))

const fields: Field[] = [
  { key: 'title', label: 'Session title', colSpan: 2, placeholder: 'Opening ceremony' },
  { key: 'eventId', label: 'Event', type: 'select', options: eventOptions },
  { key: 'competitionId', label: 'Segment', type: 'select', options: competitionOptions, hint: 'Leave on "Whole event" for plenary sessions.' },
  { key: 'date', label: 'Date', type: 'date', hint: 'Sessions are grouped by date on the public page.' },
  { key: 'startTime', label: 'Start time', placeholder: '09:00', hint: '24-hour HH:MM.' },
  { key: 'endTime', label: 'End time', placeholder: '10:00', hint: 'Optional.' },
  { key: 'sessionType', label: 'Session type', placeholder: 'Ceremony / Round / Break' },
  { key: 'venue', label: 'Room or venue', placeholder: 'Main auditorium' },
  { key: 'speaker', label: 'Speaker', placeholder: 'Optional' },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'published', label: 'Published', type: 'toggle', hint: 'Turn off to hide it without deleting.' },
  { key: 'sortOrder', label: 'Sort order', type: 'number', hint: 'Breaks ties when two sessions share a start time.' },
]
const columns = [
  { key: 'startTime', label: 'Time' },
  { key: 'title', label: 'Session' },
  { key: 'date', label: 'Date' },
  { key: 'venue', label: 'Venue' },
  { key: 'published', label: 'Live' },
]
</script>

<template>
  <AdminCollection
    title="Programme Schedule"
    subtitle="The hour-by-hour agenda on the event page. The milestone timeline is managed separately under Event Schedule."
    icon="lucide:clock"
    new-label="New session"
    endpoint="/api/admin/schedule"
    :fields="fields"
    :columns="columns"
    :defaults="defaults"
    empty-text="No sessions yet. Add check-in, the opening ceremony and the rounds."
  />
</template>
