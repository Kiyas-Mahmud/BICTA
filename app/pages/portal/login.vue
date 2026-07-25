<script setup lang="ts">
// Legacy route. Admins, volunteers and participants all sign in at /login now.
definePageMeta({ layout: false })
await navigateTo('/login', { redirectCode: 301 })
</script>

<template>
  <div />
</template>
