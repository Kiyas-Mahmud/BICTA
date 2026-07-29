<script setup lang="ts">
import type { Field } from '~/components/admin/Collection.vue'
definePageMeta({ layout: 'admin', middleware: 'admin' })

// Sponsors belong to an event; leaving the event blank keeps a sponsor on
// every edition (house partners).
const { data: tree } = await useFetch('/api/admin/event-tree', { key: 'admin-event-tree' })
const eventOptions = computed(() => [
  { value: null, label: 'All events (house partner)' },
  ...(tree.value ?? []).map((e) => ({ value: e.id, label: `${e.title} (${e.year})` })),
])

const fields: Field[] = [
  { key: 'logoUrl', label: 'Company logo', type: 'image' },
  { key: 'name', label: 'Name' },
  { key: 'eventId', label: 'Event', type: 'select', options: eventOptions, hint: 'Shown only on this event’s pages.' },
  { key: 'tier', label: 'Sponsor level', placeholder: 'Platinum / Gold / Partner' },
  { key: 'websiteUrl', label: 'Website URL', placeholder: 'https://…' },
  { key: 'contactPerson', label: 'Contact person' },
  { key: 'contactEmail', label: 'Contact email', placeholder: 'name@company.com' },
  { key: 'phone', label: 'Phone number' },
  { key: 'active', label: 'Active', type: 'toggle', hint: 'Inactive sponsors stay saved but are hidden from the site.' },
  { key: 'sortOrder', label: 'Sort order', type: 'number', hint: 'Lower numbers appear first.' },
]
const columns = [
  { key: 'name', label: 'Name' },
  { key: 'tier', label: 'Level' },
  { key: 'contactPerson', label: 'Contact' },
  { key: 'active', label: 'Active' },
  { key: 'sortOrder', label: 'Order' },
]
</script>

<template>
  <AdminCollection
    title="Sponsors & Partners"
    subtitle="Partners shown on their event's pages. Leave the event blank for a house partner that appears everywhere."
    icon="lucide:handshake"
    new-label="New sponsor"
    endpoint="/api/admin/sponsors"
    :fields="fields"
    :columns="columns"
    :defaults="{ eventId: null, active: true }"
    empty-text="No sponsors yet. Upload a logo on a transparent background for the cleanest result."
  />
</template>
