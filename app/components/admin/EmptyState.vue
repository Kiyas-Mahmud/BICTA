<script setup lang="ts">
// Shared "nothing here yet" block — used inside table bodies and grids so an
// empty screen still explains what to do next.
defineProps<{
  icon?: string
  title: string
  body?: string
}>()
</script>

<template>
  <div class="empty-state">
    <span class="empty-glyph"><Icon :name="icon ?? 'lucide:inbox'" /></span>
    <div>
      <p class="text-sm font-bold text-ink">{{ title }}</p>
      <p v-if="body" class="mx-auto mt-1 max-w-sm text-sm text-ink-faint">{{ body }}</p>
    </div>
    <div v-if="$slots.action" class="mt-1"><slot name="action" /></div>
  </div>
</template>
