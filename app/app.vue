<script setup lang="ts">
// Site-wide head, driven by the admin-configured branding rather than
// hardcoded strings. This lives in the root component so it is part of the
// server-rendered HTML on every route — social crawlers (WhatsApp, Facebook,
// Messenger, LinkedIn) do not run JavaScript, so anything set only on the
// client would be invisible to them.
//
// Same fetch key as the layouts, so this shares one request rather than
// adding another.
const { data: settings } = await useFetch<Record<string, string>>('/api/public/settings', { key: 'site-settings' })

// Trimmed: these are free-text admin fields, and stray whitespace would show
// up in the middle of a shared-link title.
const brandName = computed(() => settings.value?.brand_name?.trim() || 'BICTA')
const fullName = computed(() => settings.value?.hero_full_name?.trim() || 'Bangladesh ICT Alliance')
const previewTitle = computed(() => `${brandName.value}, ${fullName.value}`)
// Falls back to the bundled mark only when no logo has been uploaded, so the
// tab is never iconless.
const faviconHref = computed(() => settings.value?.site_logo_url || '/favicon.svg')
const faviconType = computed(() => {
  const url = faviconHref.value.toLowerCase().split('?')[0] ?? ''
  if (url.endsWith('.svg')) return 'image/svg+xml'
  if (url.endsWith('.png')) return 'image/png'
  if (url.endsWith('.webp')) return 'image/webp'
  if (url.endsWith('.jpg') || url.endsWith('.jpeg')) return 'image/jpeg'
  return undefined
})

useHead({
  // Sub-pages append the brand; the home page (which sets no title of its own)
  // gets the bare brand name, so the tab reads "BICTA".
  titleTemplate: (title) => (title ? `${title} — ${brandName.value}` : brandName.value),
  link: computed(() => [
    { rel: 'icon', type: faviconType.value, href: faviconHref.value },
    { rel: 'shortcut icon', type: faviconType.value, href: faviconHref.value },
    { rel: 'apple-touch-icon', href: faviconHref.value },
  ]),
})

// Defaults for link previews. Pages that set their own ogTitle/ogDescription
// (an event page, a news article) still win — these only fill the gaps.
useSeoMeta({
  ogSiteName: () => brandName.value,
  ogType: 'website',
  ogTitle: () => previewTitle.value,
  twitterTitle: () => previewTitle.value,
  twitterCard: 'summary',
})
</script>

<template>
  <div>
    <NuxtLoadingIndicator color="#0a0a0a" :height="2" />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
