<script setup lang="ts">
import type { Field } from '~/components/admin/Collection.vue'
definePageMeta({ layout: 'admin', middleware: 'admin' })

// Check-in points belong to the current event. Attaching one to a competition
// restricts it to that competition's participants; leaving it blank keeps an
// event-wide desk that anyone can use.
const { data: tree } = await useFetch('/api/admin/event-tree', { key: 'admin-event-tree' })
const currentEvent = computed(() => (tree.value ?? []).find((e) => e.isCurrent))
const competitionOptions = computed(() => [
  { value: null, label: 'Whole event (any participant)' },
  ...(currentEvent.value?.competitions ?? []).map((c) => ({ value: c.id, label: c.name })),
])

const fields: Field[] = [
  { key: 'name', label: 'Name', placeholder: 'Welcome Kit, Lunch, Snacks…' },
  {
    key: 'competitionId',
    label: 'Competition',
    type: 'select',
    options: competitionOptions,
    hint: 'Restricts collection to that competition’s participants.',
  },
  { key: 'location', label: 'Location', placeholder: 'Main hall, desk 3' },
  { key: 'icon', label: 'Icon', placeholder: 'package, utensils, coffee…', hint: 'Any Lucide icon name.' },
  { key: 'description', label: 'Description', type: 'textarea', colSpan: 2 },
  { key: 'qrEnabled', label: 'QR scanning enabled', type: 'toggle', hint: 'Off means volunteers mark collection manually.' },
  { key: 'active', label: 'Active', type: 'toggle', hint: 'Inactive points disappear from the scanner.' },
  { key: 'sortOrder', label: 'Sort order', type: 'number', hint: 'Order the scanner shows them in.' },
]
const columns = [
  { key: 'name', label: 'Name' },
  { key: 'location', label: 'Location' },
  { key: 'qrEnabled', label: 'QR' },
  { key: 'active', label: 'Active' },
  { key: 'sortOrder', label: 'Order' },
]
</script>

<template>
  <AdminCollection
    title="Check-in Points"
    :subtitle="currentEvent
      ? `Collection desks for ${currentEvent.title}. Volunteers pick one of these on the scanner.`
      : 'Set a current event before adding check-in points.'"
    icon="lucide:map-pin"
    new-label="New check-in point"
    endpoint="/api/admin/checkpoints"
    :fields="fields"
    :columns="columns"
    :defaults="{ competitionId: null, qrEnabled: true, active: true, location: '', description: '' }"
    empty-text="No check-in points yet. Add Welcome Kit, Lunch or Snacks, then volunteers scan participant QR codes to mark them collected."
  />
</template>
