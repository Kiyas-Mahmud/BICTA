<script setup lang="ts">
import type { Field } from '~/components/admin/Collection.vue'
definePageMeta({ layout: 'admin', middleware: 'admin' })

const fields: Field[] = [
  { key: 'name', label: 'Name' },
  { key: 'role', label: 'Role', type: 'select', options: [
    { value: 'judge', label: 'Judge' },
    { value: 'speaker', label: 'Speaker' },
  ] },
  { key: 'title', label: 'Title' },
  { key: 'organization', label: 'Organization' },
  { key: 'socialUrl', label: 'Profile URL', placeholder: 'https://…' },
  { key: 'photoUrl', label: 'Photo', type: 'image' },
  { key: 'bio', label: 'Bio', type: 'rich' },
  { key: 'sortOrder', label: 'Sort order', type: 'number' },
]
const columns = [
  { key: 'name', label: 'Name' },
  { key: 'role', label: 'Role' },
  { key: 'organization', label: 'Organization' },
  { key: 'sortOrder', label: 'Order' },
]
</script>

<template>
  <AdminCollection
    title="Judges & Speakers"
    endpoint="/api/admin/people"
    :fields="fields"
    :columns="columns"
    empty-text="No judges or speakers yet."
  />
</template>
