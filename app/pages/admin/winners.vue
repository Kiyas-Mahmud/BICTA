<script setup lang="ts">
import type { Field } from '~/components/admin/Collection.vue'
definePageMeta({ layout: 'admin', middleware: 'admin' })

const fields: Field[] = [
  { key: 'name', label: 'Name / team' },
  { key: 'position', label: 'Position', placeholder: 'Champion' },
  { key: 'competitionName', label: 'Competition' },
  { key: 'year', label: 'Year', type: 'number' },
  { key: 'projectTitle', label: 'Project title' },
  { key: 'photoUrl', label: 'Photo', type: 'image' },
  { key: 'sortOrder', label: 'Sort order', type: 'number' },
]
const columns = [
  { key: 'name', label: 'Name' },
  { key: 'competitionName', label: 'Competition' },
  { key: 'year', label: 'Year' },
  { key: 'sortOrder', label: 'Order' },
]
</script>

<template>
  <AdminCollection
    title="Previous Winners"
    endpoint="/api/admin/winners"
    :fields="fields"
    :columns="columns"
    empty-text="No winners yet."
  />
</template>
