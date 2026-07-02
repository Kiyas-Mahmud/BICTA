<script setup lang="ts">
const { data: articles } = await useFetch('/api/public/news')
useSeoMeta({ title: 'News', description: 'Announcements and updates from BICTA.' })
</script>

<template>
  <section class="container-site section">
    <SiteBackButton to="/" label="Back to home" />
    <h1 class="text-display mt-6">News</h1>
    <p class="mt-3 text-lg text-ink-soft">Announcements and updates.</p>

    <div v-if="articles?.length" class="mt-10 grid gap-5" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))">
      <SiteNewsCard v-for="article in articles" :key="article.id" :article="article" />
    </div>
    <div v-else class="mt-16 rounded-2xl border border-dashed border-line py-16 text-center text-ink-faint">
      No news yet. Check back soon.
    </div>
  </section>
</template>
