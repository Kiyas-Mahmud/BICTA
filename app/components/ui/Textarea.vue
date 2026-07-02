<script setup lang="ts">
defineOptions({ inheritAttrs: false })
const model = defineModel<string>()
</script>

<template>
  <!-- design-system field style (main.css .field) -->
  <textarea v-model="model" v-bind="$attrs" class="field min-h-[80px] disabled:cursor-not-allowed disabled:opacity-50" />
</template>
