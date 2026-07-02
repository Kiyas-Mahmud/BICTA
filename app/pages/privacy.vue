<script setup lang="ts">
const { data: settings } = await useFetch('/api/public/settings', { key: 'site-settings' })
const body = computed(
  () =>
    (settings.value as any)?.privacy_policy ||
    'We collect only the information needed to run the competition: registration details (name, email, phone, institution, team members) and newsletter emails. This data is visible to organizers only, is never sold or shared with third parties, and is removed after the event cycle ends. Contact us to have your data corrected or deleted.',
)
useSeoMeta({ title: 'Privacy Policy', robots: 'noindex' })
</script>

<template>
  <section class="container-site section">
    <SiteBackButton to="/" label="Back to home" />
    <div class="mx-auto mt-6 max-w-3xl">
      <h1 class="text-display">Privacy Policy</h1>
      <p class="prose-site mt-8 whitespace-pre-line">{{ body }}</p>
    </div>
  </section>
</template>
