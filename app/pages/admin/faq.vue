<script setup lang="ts">
import type { Field } from '~/components/admin/Collection.vue'
definePageMeta({ layout: 'admin', middleware: 'admin' })

// A question can live in three places: site-wide (home page FAQ), on one
// event's page, or on a single competition's page. Leave both scopes blank for
// site-wide; setting a competition wins over the event.
const { data: tree } = await useFetch('/api/admin/event-tree', { key: 'admin-event-tree' })

const eventOptions = computed(() => [
  { value: null, label: 'Site-wide (home page)' },
  ...(tree.value ?? []).map((e) => ({ value: e.id, label: `${e.title} (${e.year})` })),
])
const competitionOptions = computed(() => [
  { value: null, label: 'Whole event' },
  ...(tree.value ?? []).flatMap((e) => e.competitions.map((c) => ({ value: c.id, label: `${e.title} › ${c.name}` }))),
])

const fields: Field[] = [
  { key: 'question', label: 'Question', colSpan: 2, placeholder: 'Who can take part?' },
  { key: 'answer', label: 'Answer', type: 'rich' },
  { key: 'eventId', label: 'Show on', type: 'select', options: eventOptions, hint: 'Blank keeps it in the home page FAQ.' },
  {
    key: 'competitionId',
    label: 'Narrow to a competition',
    type: 'select',
    options: competitionOptions,
    hint: 'Optional. Overrides the event scope above.',
  },
  { key: 'sortOrder', label: 'Sort order', type: 'number', hint: 'Lower numbers appear first.' },
]

const columns = [
  { key: 'question', label: 'Question' },
  { key: 'sortOrder', label: 'Order' },
]
</script>

<template>
  <AdminCollection
    title="FAQ"
    subtitle="Answers shown in the home page FAQ, or scoped to one event or competition."
    icon="lucide:circle-help"
    new-label="New question"
    endpoint="/api/admin/faqs"
    :fields="fields"
    :columns="columns"
    :defaults="{ eventId: null, competitionId: null }"
    empty-text="No questions yet. Add the ones people email you most often."
  />
</template>
