<script setup lang="ts">
// Sticky save bar for long forms — the primary action stays reachable without
// scrolling back to the top.
defineProps<{ saving?: boolean; label?: string; hint?: string; disabled?: boolean }>()
</script>

<template>
  <div class="sticky bottom-4 z-20 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white/92 p-3 shadow-lift backdrop-blur">
    <button type="submit" class="btn-primary !py-2.5" :disabled="saving || disabled">
      <Icon :name="saving ? 'lucide:loader-2' : 'lucide:check'" :class="{ 'animate-spin': saving }" />
      {{ saving ? 'Saving…' : (label ?? 'Save') }}
    </button>
    <slot />
    <span v-if="hint" class="text-xs text-ink-faint">{{ hint }}</span>
  </div>
</template>
