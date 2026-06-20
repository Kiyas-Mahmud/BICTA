<script setup lang="ts">
import type { Field } from '~/components/admin/Collection.vue'
definePageMeta({ layout: 'admin', middleware: 'admin' })

const fields: Field[] = [
  { key: 'question', label: 'Question', colSpan: 2 },
  { key: 'answer', label: 'Answer', type: 'rich' },
  { key: 'sortOrder', label: 'Sort order', type: 'number' },
]
const columns = [
  { key: 'question', label: 'Question' },
  { key: 'sortOrder', label: 'Order' },
]
</script>

<template>
  <AdminCollection
    title="FAQ"
    endpoint="/api/admin/faqs"
    :fields="fields"
    :columns="columns"
    empty-text="No questions yet."
  />
</template>
