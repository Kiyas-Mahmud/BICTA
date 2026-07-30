<script setup lang="ts">
// The picker that sits above an event-scoped admin list.
defineProps<{
  options: { value: number | string; label: string }[]
  hint?: string
}>()
const model = defineModel<number | ''>({ required: true })
</script>

<template>
  <div class="toolbar">
    <div class="select-wrap">
      <Icon name="lucide:calendar-days" />
      <label class="sr-only" for="event-filter">Event</label>
      <select id="event-filter" v-model="model" class="input w-full sm:w-64">
        <option v-for="o in options" :key="String(o.value)" :value="o.value">{{ o.label }}</option>
      </select>
    </div>
    <p v-if="hint" class="text-xs text-ink-faint">{{ hint }}</p>
  </div>
</template>
