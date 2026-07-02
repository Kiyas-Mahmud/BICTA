<script setup lang="ts">
// Legacy route. The competition experience now lives at /events/[id]
// (id === competition id). Resolve the slug and redirect permanently.
const route = useRoute()
const { data: comp } = await useFetch(`/api/public/competitions/${route.params.slug}`)

if (!comp.value) {
  throw createError({ statusCode: 404, statusMessage: 'Competition not found', fatal: true })
}

await navigateTo(`/events/${comp.value.id}`, { redirectCode: 301 })
</script>

<template>
  <div />
</template>
