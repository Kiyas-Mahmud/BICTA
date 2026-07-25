<script setup lang="ts">
import type { Field } from '~/components/admin/Collection.vue'
definePageMeta({ layout: 'admin', middleware: 'admin' })

const fields: Field[] = [
  { key: 'logoUrl', label: 'Company logo', type: 'image' },
  { key: 'name', label: 'Name' },
  { key: 'tier', label: 'Tier', placeholder: 'Platinum / Gold / Partner' },
  { key: 'websiteUrl', label: 'Website URL', placeholder: 'https://…' },
  { key: 'sortOrder', label: 'Sort order', type: 'number', hint: 'Lower numbers appear first.' },
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
    subtitle="Logos shown in the partners wall on the home page."
    icon="lucide:handshake"
    new-label="New sponsor"
    endpoint="/api/admin/sponsors"
    :fields="fields"
    :columns="columns"
    empty-text="No sponsors yet. Upload a logo on a transparent background for the cleanest result."
  />
</template>
