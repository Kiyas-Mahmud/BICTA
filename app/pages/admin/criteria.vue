<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

// This content moved onto the event it belongs to. Kept as a redirect so old
// bookmarks and links land somewhere useful instead of 404ing.
await navigateTo('/admin/events', { redirectCode: 302 })
</script>

<template>
  <div />
</template>
