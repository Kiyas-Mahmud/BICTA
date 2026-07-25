<script setup lang="ts">
import type { Field } from '~/components/admin/Collection.vue'
definePageMeta({ layout: 'admin', middleware: 'admin' })

const fields: Field[] = [
  { key: 'title', label: 'Title' },
  { key: 'icon', label: 'Icon', placeholder: 'trophy, rocket, banknote…', hint: 'Any Lucide icon name.' },
  { key: 'body', label: 'Description', type: 'textarea', colSpan: 2 },
  { key: 'sortOrder', label: 'Sort order', type: 'number', hint: 'Lower numbers appear first.' },
]
const columns = [
  { key: 'title', label: 'Title' },
  { key: 'icon', label: 'Icon' },
  { key: 'sortOrder', label: 'Order' },
]
</script>

<template>
  <AdminCollection
    title="Why Join"
    subtitle="Reason cards in the Why Join section on the home page."
    icon="lucide:sparkles"
    new-label="New reason"
    endpoint="/api/admin/home-features"
    :fields="fields"
    :columns="columns"
    empty-text="No reasons yet. Three to six short cards read best."
  />
</template>
