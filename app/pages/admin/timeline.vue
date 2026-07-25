<script setup lang="ts">
import type { Field } from '~/components/admin/Collection.vue'
definePageMeta({ layout: 'admin', middleware: 'admin' })

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
</script>

<template>
  <AdminCollection
    title="Important Dates"
    subtitle="Milestones for the current event, shown in the public timeline."
    icon="lucide:milestone"
    new-label="New milestone"
    endpoint="/api/admin/timeline"
    :fields="fields"
    :columns="columns"
    empty-text="No milestones yet. If this stays empty after adding one, set a current event first."
  />
</template>
