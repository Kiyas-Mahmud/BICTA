<script setup lang="ts">
defineOptions({ inheritAttrs: false })
const model = defineModel<string>()
</script>

<template>
  <textarea
    v-model="model"
    v-bind="$attrs"
    class="flex min-h-[60px] w-full rounded-md border border-line bg-white/60 px-3 py-2 text-sm shadow-sm placeholder:text-ink/40 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
  />
</template>
