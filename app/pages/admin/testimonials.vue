<script setup lang="ts">
import type { Field } from '~/components/admin/Collection.vue'
definePageMeta({ layout: 'admin', middleware: 'admin' })

const fields: Field[] = [
  { key: 'name', label: 'Name' },
  { key: 'role', label: 'Role / achievement', placeholder: 'Team Quantum, Datathon Champion 2025' },
  { key: 'quote', label: 'Quote', type: 'textarea', colSpan: 2 },
  { key: 'photoUrl', label: 'Photo', type: 'image' },
  { key: 'sortOrder', label: 'Sort order', type: 'number' },
]
const columns = [
  { key: 'name', label: 'Name' },
  { key: 'role', label: 'Role' },
  { key: 'quote', label: 'Quote' },
  { key: 'sortOrder', label: 'Order' },
]
</script>

<template>
  <AdminCollection
    title="Testimonials"
    endpoint="/api/admin/testimonials"
    :fields="fields"
    :columns="columns"
    empty-text="No testimonials yet."
  />
</template>
