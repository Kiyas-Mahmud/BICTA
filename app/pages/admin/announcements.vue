<script setup lang="ts">
import type { Field } from '~/components/admin/Collection.vue'
definePageMeta({ layout: 'admin', middleware: 'admin' })

// Per-event notice board. Pinned notices sit at the top of the event page's
// Announcements section; unpublished ones stay saved but hidden.
const { data: tree } = await useFetch('/api/admin/event-tree', { key: 'admin-event-tree' })
const eventOptions = computed(() => (tree.value ?? []).map((e) => ({ value: e.id, label: `${e.title} (${e.year})` })))
// Preselect an event so a new notice is never saved unscoped.
const defaults = computed(() => ({ eventId: eventOptions.value[0]?.value ?? null, pinned: false, published: true }))

const fields: Field[] = [
  { key: 'title', label: 'Headline', colSpan: 2, placeholder: 'Submission deadline extended to Friday' },
  { key: 'body', label: 'Details', type: 'rich' },
  { key: 'eventId', label: 'Event', type: 'select', options: eventOptions, hint: 'The event page this notice appears on.' },
  { key: 'pinned', label: 'Pin to top', type: 'toggle', hint: 'Pinned notices show above the rest.' },
  { key: 'published', label: 'Published', type: 'toggle', hint: 'Turn off to hide it without deleting.' },
]
const columns = [
  { key: 'title', label: 'Headline' },
  { key: 'eventTitle', label: 'Event' },
  { key: 'pinned', label: 'Pinned' },
  { key: 'published', label: 'Live' },
]
</script>

<template>
  <AdminCollection
    title="Announcements"
    subtitle="Notices shown on an event's page. Use these for deadline changes, venue updates and day-of instructions."
    icon="lucide:megaphone"
    new-label="New announcement"
    endpoint="/api/admin/announcements"
    :fields="fields"
    :columns="columns"
    :defaults="defaults"
    empty-text="No announcements yet. Post one when something changes for participants."
  />
</template>
