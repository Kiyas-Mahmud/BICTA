<script setup lang="ts">
import type { Field } from '~/components/admin/Collection.vue'
definePageMeta({ layout: 'admin', middleware: 'admin' })

// Categories are fixed rather than free text so the public page can group by
// them without normalising strings. Adding a fourth tier means adding it here,
// to the Zod enum and to ADVISOR_CATEGORIES on the About page.
const fields: Field[] = [
  { key: 'name', label: 'Full name' },
  {
    key: 'category',
    label: 'Panel',
    type: 'select',
    options: [
      { value: 'university', label: 'University Advisors' },
      { value: 'industry', label: 'Industry Advisors' },
      { value: 'core', label: 'Core Team' },
    ],
  },
  { key: 'designation', label: 'Designation', placeholder: 'Professor, CTO, Convener…' },
  { key: 'organization', label: 'Organisation', placeholder: 'University or company name' },
  { key: 'linkedinUrl', label: 'LinkedIn URL', placeholder: 'https://linkedin.com/in/…', hint: 'Optional. Shown as a link on the card.' },
  { key: 'photoUrl', label: 'Profile photo', type: 'image', colSpan: 2 },
  { key: 'sortOrder', label: 'Sort order', type: 'number', hint: 'Lower numbers appear first, within each panel.' },
]

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'category', label: 'Panel' },
  { key: 'designation', label: 'Designation' },
  { key: 'organization', label: 'Organisation' },
  { key: 'sortOrder', label: 'Order' },
]
</script>

<template>
  <AdminCollection
    title="Advisor Panel"
    subtitle="University advisors, industry advisors and the core team, shown on the About page."
    icon="lucide:user-round-check"
    new-label="New advisor"
    endpoint="/api/admin/advisors"
    :fields="fields"
    :columns="columns"
    :defaults="{ category: 'university' }"
    empty-text="No advisors yet. Add the people who guide the programme and they appear on the About page."
  />
</template>
