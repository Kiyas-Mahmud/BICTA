<script setup lang="ts">
// Labelled toggle row. The whole row is the label, so the hit target is large
// on touch, and the native checkbox keeps keyboard + screen-reader behaviour.
defineProps<{ label: string; hint?: string }>()
const model = defineModel<boolean>({ default: false })
</script>

<template>
  <label
    class="flex min-h-[2.75rem] cursor-pointer items-center justify-between gap-3 rounded-xl border border-line bg-white px-3.5 py-2.5 transition-colors hover:border-brand-200 hover:bg-brand-50/40"
  >
    <span class="min-w-0">
      <span class="block text-sm font-semibold text-ink">{{ label }}</span>
      <span v-if="hint" class="mt-0.5 block text-xs text-ink-faint">{{ hint }}</span>
    </span>
    <span class="relative inline-flex shrink-0">
      <input v-model="model" type="checkbox" class="peer sr-only" />
      <span class="switch-track" />
      <span class="switch-knob" />
    </span>
  </label>
</template>
