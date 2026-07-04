<script setup lang="ts">
definePageMeta({ layout: 'portal', middleware: 'participant' })
const route = useRoute()
const token = computed(() => String(route.query.token ?? ''))
useSeoMeta({ title: 'Set your password', robots: 'noindex' })
</script>

<template>
  <PortalAuthCard title="Welcome to BICTA" subtitle="Set a password to activate your participant account.">
    <PortalSetPasswordForm endpoint="/api/participant/set-password" :token="token" />
  </PortalAuthCard>
</template>
