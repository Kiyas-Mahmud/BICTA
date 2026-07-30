<script setup lang="ts">
import type { Field } from '~/components/admin/Collection.vue'
definePageMeta({ layout: 'admin', middleware: 'admin' })

// Sponsors belong to an event; leaving the event blank keeps a sponsor on
// every edition (house partners).
// The filter drives which sponsors are listed; the field below sets which event
// a sponsor belongs to. House partners (no event) always show, because they
// appear on every edition's page.
const { eventOptions: filterOptions, eventId, query, activeEvent } = useEventFilter({ allowAll: true })
const eventOptions = computed(() => [
  { value: null, label: 'All events (house partner)' },
  ...filterOptions.value.filter((o) => o.value !== ''),
])
const defaults = computed(() => ({ eventId: eventId.value || null, active: true }))

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
  <div class="space-y-4">
    <AdminPageHeader
      title="Sponsors & Partners"
      :subtitle="activeEvent ? `Partners on ${activeEvent.title}, plus house partners shown everywhere.` : 'Partners shown on their event pages. Leave the event blank for a house partner that appears everywhere.'"
      icon="lucide:handshake"
    />

    <AdminEventFilter v-model="eventId" :options="filterOptions" hint="House partners appear under every edition." />

    <AdminCollection
      :key="String(eventId)"
      flush
      title="Sponsors"
      subtitle="Shown grouped by tier on the event page."
      new-label="New sponsor"
      endpoint="/api/admin/sponsors"
      :query="query"
      :fields="fields"
      :columns="columns"
      :defaults="defaults"
      empty-text="No sponsors for this selection yet. Upload a logo on a transparent background for the cleanest result."
    />
  </div>
</template>
