<script setup lang="ts">
import type { Field } from '~/components/admin/Collection.vue'
definePageMeta({ layout: 'admin', middleware: 'admin' })

const fields: Field[] = [
  { key: 'name', label: 'Name', placeholder: 'Welcome Kit, Lunch, Snacks…' },
  { key: 'icon', label: 'Icon (Lucide name)', placeholder: 'package, utensils, coffee…' },
  { key: 'sortOrder', label: 'Sort order', type: 'number' },
]
const columns = [
  { key: 'name', label: 'Name' },
  { key: 'icon', label: 'Icon' },
  { key: 'sortOrder', label: 'Order' },
]
</script>

<template>
  <div>
    <AdminCollection
      title="Check-in Points (current event)"
      endpoint="/api/admin/checkpoints"
      :fields="fields"
      :columns="columns"
      empty-text="No checkpoints yet. Add Welcome Kit / Lunch / Snacks, then volunteers scan participant QRs to mark them collected."
    />
  </div>
</template>
