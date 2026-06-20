<script setup lang="ts">
const props = defineProps<{ to?: string; label?: string }>()

function goBack() {
  if (props.to) return navigateTo(props.to)
  // Prefer real history back; fall back to home.
  if (import.meta.client && window.history.length > 1) return router.back()
  return navigateTo('/')
}
const router = useRouter()
</script>

<template>
  <button type="button" class="back-btn" @click="goBack">
    <Icon name="lucide:arrow-left" />
    {{ label ?? 'Back' }}
  </button>
</template>
