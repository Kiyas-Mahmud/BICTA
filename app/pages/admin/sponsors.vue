<script setup lang="ts">
import type { Field } from '~/components/admin/Collection.vue'
definePageMeta({ layout: 'admin', middleware: 'admin' })

const fields: Field[] = [
  { key: 'logoUrl', label: 'Company logo', type: 'image' },
  { key: 'name', label: 'Name' },
  { key: 'tier', label: 'Tier', placeholder: 'Platinum / Gold / Partner' },
  { key: 'websiteUrl', label: 'Website URL', placeholder: 'https://…' },
  { key: 'sortOrder', label: 'Sort order', type: 'number' },
]
const columns = [
  { key: 'name', label: 'Name' },
  { key: 'tier', label: 'Tier' },
  { key: 'sortOrder', label: 'Order' },
]
</script>

<template>
  <AdminCollection
    title="Sponsors & Partners"
    endpoint="/api/admin/sponsors"
    :fields="fields"
    :columns="columns"
    empty-text="No sponsors yet."
  />
</template>
