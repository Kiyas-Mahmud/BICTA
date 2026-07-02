<script setup lang="ts">
// Legacy route → redirect to the new event registration page.
const route = useRoute()
const { data: comp } = await useFetch(`/api/public/competitions/${route.params.slug}`)

if (!comp.value) {
  throw createError({ statusCode: 404, statusMessage: 'Competition not found', fatal: true })
}

await navigateTo(`/events/${comp.value.id}/register`, { redirectCode: 301 })
</script>

<template>
  <div />
</template>
