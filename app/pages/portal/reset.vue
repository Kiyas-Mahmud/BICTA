<script setup lang="ts">
definePageMeta({ layout: 'portal', middleware: 'participant' })
const route = useRoute()
const token = computed(() => String(route.query.token ?? ''))
useSeoMeta({ title: 'Reset your password', robots: 'noindex' })
</script>

<template>
  <PortalAuthCard title="Choose a new password" subtitle="Almost done — pick a new password below.">
    <PortalSetPasswordForm endpoint="/api/participant/reset" :token="token" />
  </PortalAuthCard>
</template>
