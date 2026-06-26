<script setup lang="ts">
defineOptions({ inheritAttrs: false })
const model = defineModel<string>()
</script>

<template>
  <input
    v-model="model"
    v-bind="$attrs"
    class="flex h-9 w-full rounded-md border border-line bg-white/60 px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-ink/40 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
  />
</template>
