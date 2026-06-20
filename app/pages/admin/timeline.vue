<script setup lang="ts">
import type { Field } from '~/components/admin/Collection.vue'
definePageMeta({ layout: 'admin', middleware: 'admin' })

const fields: Field[] = [
  { key: 'label', label: 'Label' },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'note', label: 'Note', type: 'textarea', colSpan: 2 },
  { key: 'sortOrder', label: 'Sort order', type: 'number' },
]
const columns = [
  { key: 'label', label: 'Label' },
  { key: 'date', label: 'Date' },
  { key: 'sortOrder', label: 'Order' },
]
</script>

<template>
  <div>
    <AdminCollection
      title="Important Dates (current event)"
      endpoint="/api/admin/timeline"
      :fields="fields"
      :columns="columns"
      empty-text="No milestones yet. Set a current event first if this stays empty."
    />
  </div>
</template>
