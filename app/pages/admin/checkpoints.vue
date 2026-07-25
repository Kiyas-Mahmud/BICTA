<script setup lang="ts">
import type { Field } from '~/components/admin/Collection.vue'
definePageMeta({ layout: 'admin', middleware: 'admin' })

const fields: Field[] = [
  { key: 'name', label: 'Name', placeholder: 'Welcome Kit, Lunch, Snacks…' },
  { key: 'icon', label: 'Icon', placeholder: 'package, utensils, coffee…', hint: 'Any Lucide icon name.' },
  { key: 'sortOrder', label: 'Sort order', type: 'number', hint: 'Order the scanner shows them in.' },
]
const columns = [
  { key: 'name', label: 'Name' },
  { key: 'icon', label: 'Icon' },
  { key: 'sortOrder', label: 'Order' },
]
</script>

<template>
  <AdminCollection
    title="Check-in Points"
    subtitle="Collection booths for the current event. Volunteers pick one of these on the scanner."
    icon="lucide:map-pin"
    new-label="New check-in point"
    endpoint="/api/admin/checkpoints"
    :fields="fields"
    :columns="columns"
    empty-text="No checkpoints yet. Add Welcome Kit, Lunch or Snacks, then volunteers scan participant QR codes to mark them collected."
  />
</template>
