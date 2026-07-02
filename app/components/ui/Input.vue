<script setup lang="ts">
defineOptions({ inheritAttrs: false })
const model = defineModel<string>()
</script>

<template>
  <!-- design-system field style (main.css .field) -->
  <input v-model="model" v-bind="$attrs" class="field disabled:cursor-not-allowed disabled:opacity-50" />
</template>
