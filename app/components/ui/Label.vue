<script setup lang="ts">
defineOptions({ inheritAttrs: false })
</script>

<template>
  <label v-bind="$attrs" class="mb-1.5 block text-sm font-bold text-ink peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
    <slot />
  </label>
</template>
