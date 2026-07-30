<script setup lang="ts">
import type { Field } from '~/components/admin/Collection.vue'
definePageMeta({ layout: 'admin', middleware: 'admin' })

// The event-level prize pool shown on the event page. Prizes belonging to a
// single competition stay on that competition's own form.
const { data: tree } = await useFetch('/api/admin/event-tree', { key: 'admin-event-tree' })
const eventOptions = computed(() => (tree.value ?? []).map((e) => ({ value: e.id, label: `${e.title} (${e.year})` })))
const defaults = computed(() => ({ eventId: eventOptions.value[0]?.value ?? null, highlight: false, published: true }))

const fields: Field[] = [
  { key: 'title', label: 'Prize title', colSpan: 2, placeholder: 'Champion' },
  { key: 'eventId', label: 'Event', type: 'select', options: eventOptions, hint: 'Which edition this prize belongs to.' },
  { key: 'amount', label: 'Amount', placeholder: 'BDT 100,000 — or "Internship offer"' },
  { key: 'note', label: 'Note', type: 'textarea', hint: 'Optional detail, e.g. what else the winner receives.' },
  { key: 'highlight', label: 'Highlight this prize', type: 'toggle', hint: 'Gives the champion card the accent treatment.' },
  { key: 'published', label: 'Published', type: 'toggle', hint: 'Turn off to hide it without deleting.' },
  { key: 'sortOrder', label: 'Sort order', type: 'number', hint: 'Lower numbers appear first.' },
]
const columns = [
  { key: 'title', label: 'Prize' },
  { key: 'amount', label: 'Amount' },
  { key: 'eventTitle', label: 'Event' },
  { key: 'published', label: 'Live' },
  { key: 'sortOrder', label: 'Order' },
]
</script>

<template>
  <AdminCollection
    title="Prize Pool"
    subtitle="Event-level prizes shown on the event page. Competition prizes live on each competition's form."
    icon="lucide:award"
    new-label="New prize"
    endpoint="/api/admin/event-prizes"
    :fields="fields"
    :columns="columns"
    :defaults="defaults"
    empty-text="No prizes yet. Add the champion prize first, then the runners-up."
  />
</template>
