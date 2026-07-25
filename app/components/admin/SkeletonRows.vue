<script setup lang="ts">
// Placeholder rows while a table refetches, so filter changes don't collapse
// the layout into an empty flash.
withDefaults(defineProps<{ rows?: number; cols?: number }>(), { rows: 5, cols: 4 })
</script>

<template>
  <div class="divide-y divide-line">
    <div v-for="r in rows" :key="r" class="flex items-center gap-4 px-5 py-4">
      <span class="skel h-9 w-9 shrink-0 rounded-full" />
      <span class="skel h-3.5 flex-1" :style="{ maxWidth: '40%' }" />
      <span v-for="c in Math.max(0, cols - 2)" :key="c" class="skel hidden h-3.5 flex-1 sm:block" />
    </div>
  </div>
</template>
