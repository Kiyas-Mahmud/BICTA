<script setup lang="ts">
import type { Field } from '~/components/admin/Collection.vue'
definePageMeta({ layout: 'admin', middleware: 'admin' })

const fields: Field[] = [
  { key: 'title', label: 'Title' },
  { key: 'icon', label: 'Icon (Lucide name)', placeholder: 'trophy, rocket, banknote…' },
  { key: 'body', label: 'Description', type: 'textarea', colSpan: 2 },
  { key: 'sortOrder', label: 'Sort order', type: 'number' },
]
const columns = [
  { key: 'title', label: 'Title' },
  { key: 'icon', label: 'Icon' },
  { key: 'sortOrder', label: 'Order' },
]
</script>

<template>
  <AdminCollection
    title="Why Join (features)"
    endpoint="/api/admin/home-features"
    :fields="fields"
    :columns="columns"
    empty-text="No features yet."
  />
</template>
