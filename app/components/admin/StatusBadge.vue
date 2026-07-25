<script setup lang="ts">
// One pill for every status string in the console (registration status, event
// status, article status, read state…). Tone comes from the shared map.
const props = defineProps<{
  status: string
  tone?: import('~/composables/useConsole').StatusTone
  label?: string
}>()

const tone = computed(() => props.tone ?? statusTone(props.status))
</script>

<template>
  <span class="status" :class="`status-${tone}`">{{ label ?? status }}</span>
</template>
