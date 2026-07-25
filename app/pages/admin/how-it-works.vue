<script setup lang="ts">
import type { Field } from '~/components/admin/Collection.vue'
definePageMeta({ layout: 'admin', middleware: 'admin' })

const fields: Field[] = [
  { key: 'title', label: 'Step title' },
  { key: 'icon', label: 'Icon', placeholder: 'rocket, trophy, user-plus…', hint: 'Any Lucide icon name.' },
  { key: 'body', label: 'Description', type: 'textarea', colSpan: 2 },
  { key: 'sortOrder', label: 'Sort order', type: 'number', hint: 'Steps run in this order.' },
]
const columns = [
  { key: 'title', label: 'Title' },
  { key: 'icon', label: 'Icon' },
  { key: 'sortOrder', label: 'Order' },
]
</script>

<template>
  <AdminCollection
    title="How It Works"
    subtitle="The step-by-step block that explains taking part."
    icon="lucide:list-checks"
    new-label="New step"
    endpoint="/api/admin/how-it-works"
    :fields="fields"
    :columns="columns"
    empty-text="No steps yet. Register, build, present is a good starting point."
  />
</template>
