<script setup lang="ts">
import type { Field } from '~/components/admin/Collection.vue'
definePageMeta({ layout: 'admin', middleware: 'admin' })

const fields: Field[] = [
  { key: 'question', label: 'Question', colSpan: 2, placeholder: 'Who can take part?' },
  { key: 'answer', label: 'Answer', type: 'rich' },
  { key: 'sortOrder', label: 'Sort order', type: 'number', hint: 'Lower numbers appear first.' },
]
const columns = [
  { key: 'question', label: 'Question' },
  { key: 'sortOrder', label: 'Order' },
]
</script>

<template>
  <AdminCollection
    title="FAQ"
    subtitle="Questions answered in the FAQ section on the home page."
    icon="lucide:circle-help"
    new-label="New question"
    endpoint="/api/admin/faqs"
    :fields="fields"
    :columns="columns"
    empty-text="No questions yet. Add the ones people email you most often."
  />
</template>
