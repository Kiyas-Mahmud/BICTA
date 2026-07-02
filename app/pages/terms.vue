<script setup lang="ts">
const { data: settings } = await useFetch('/api/public/settings', { key: 'site-settings' })
const body = computed(
  () =>
    (settings.value as any)?.terms_conditions ||
    'By registering for a BICTA competition you agree to: submit only original work, follow each competition\'s published rules, respect the code of conduct at all venues, and accept that judging decisions are final. BICTA may photograph events for promotional use. Violating these terms may lead to disqualification.',
)
useSeoMeta({ title: 'Terms & Conditions', robots: 'noindex' })
</script>

<template>
  <section class="container-site section">
    <SiteBackButton to="/" label="Back to home" />
    <div class="mx-auto mt-6 max-w-3xl">
      <h1 class="text-display">Terms & Conditions</h1>
      <p class="prose-site mt-8 whitespace-pre-line">{{ body }}</p>
    </div>
  </section>
</template>
