<script setup lang="ts">
import type { Field } from '~/components/admin/Collection.vue'
definePageMeta({ layout: 'admin', middleware: 'admin' })

// Judging criteria. Leaving the segment on "Whole event" shows the criterion
// on the event page; picking one scopes it to that competition's page.
const { data: tree } = await useFetch('/api/admin/event-tree', { key: 'admin-event-tree' })
const { data: rows } = await useFetch('/api/admin/criteria', { key: 'admin-criteria-total' })

const eventOptions = computed(() => (tree.value ?? []).map((e) => ({ value: e.id, label: `${e.title} (${e.year})` })))
const competitionOptions = computed(() => [
  { value: null, label: 'Whole event' },
  ...(tree.value ?? []).flatMap((e) => e.competitions.map((c) => ({ value: c.id, label: `${e.title} › ${c.name}` }))),
])
const defaults = computed(() => ({ eventId: eventOptions.value[0]?.value ?? null, competitionId: null, published: true }))

// Weights should add up to 100 within each scope; surface it rather than block.
const weightGroups = computed(() => {
  const groups = new Map<string, { label: string; total: number }>()
  for (const r of (rows.value ?? []) as any[]) {
    if (!r.published) continue
    const key = `${r.eventId}:${r.competitionId ?? 'event'}`
    const label = r.competitionId
      ? `${r.eventTitle} › ${competitionOptions.value.find((c) => c.value === r.competitionId)?.label?.split(' › ')[1] ?? 'segment'}`
      : `${r.eventTitle} (event-wide)`
    const g = groups.get(key) ?? { label, total: 0 }
    g.total += r.weight
    groups.set(key, g)
  }
  return [...groups.values()]
})

const fields: Field[] = [
  { key: 'name', label: 'Criterion', colSpan: 2, placeholder: 'Innovation' },
  { key: 'description', label: 'What judges look for', type: 'textarea' },
  { key: 'eventId', label: 'Event', type: 'select', options: eventOptions },
  { key: 'competitionId', label: 'Applies to', type: 'select', options: competitionOptions, hint: 'Whole event, or one segment.' },
  { key: 'weight', label: 'Weight (%)', type: 'number', hint: 'Weights in one scope should total 100.' },
  { key: 'icon', label: 'Icon', placeholder: 'lucide:lightbulb', hint: 'Any Lucide icon name. Optional.' },
  { key: 'published', label: 'Published', type: 'toggle' },
  { key: 'sortOrder', label: 'Sort order', type: 'number', hint: 'Lower numbers appear first.' },
]
const columns = [
  { key: 'name', label: 'Criterion' },
  { key: 'weight', label: 'Weight' },
  { key: 'eventTitle', label: 'Event' },
  { key: 'published', label: 'Live' },
  { key: 'sortOrder', label: 'Order' },
]
</script>

<template>
  <div class="space-y-4">
    <div v-if="weightGroups.length" class="surface p-4">
      <p class="console-label">Weight check</p>
      <div class="mt-2 flex flex-wrap gap-1.5">
        <span
          v-for="g in weightGroups"
          :key="g.label"
          class="status"
          :class="g.total === 100 ? 'status-ok' : 'status-warn'"
        >
          {{ g.label }}: {{ g.total }}%
        </span>
      </div>
      <p class="mt-2 text-xs text-ink-faint">Each scope should total 100%. The public page shows the same warning.</p>
    </div>

    <AdminCollection
      title="Judging Criteria"
      subtitle="How entries are scored. Criteria can apply to the whole event or to one competition segment."
      icon="lucide:list-checks"
      new-label="New criterion"
      endpoint="/api/admin/criteria"
      :fields="fields"
      :columns="columns"
      :defaults="defaults"
      empty-text="No criteria yet. Add the ones judges will score against."
    />
  </div>
</template>
