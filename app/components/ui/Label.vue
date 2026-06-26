<script setup lang="ts">
defineOptions({ inheritAttrs: false })
</script>

<template>
  <label
    v-bind="$attrs"
    class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
  >
    <slot />
  </label>
</template>
