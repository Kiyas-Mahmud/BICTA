<script setup lang="ts">
const route = useRoute()
const { data: article } = await useFetch(`/api/public/news/${route.params.slug}`)

if (!article.value) {
  throw createError({ statusCode: 404, statusMessage: 'Article not found', fatal: true })
}

useSeoMeta({
  title: article.value.title,
  description: article.value.excerpt,
  ogImage: article.value.coverImage ?? undefined,
})
</script>

<template>
  <article v-if="article" class="container-site section">
    <div class="mx-auto max-w-3xl">
      <SiteBackButton to="/news" label="All news" />
      <p class="mt-8 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-ink-faint">
        <Icon name="lucide:calendar" /> {{ formatDate(article.publishedAt) }}
      </p>
      <h1 class="text-title mt-3">{{ article.title }}</h1>
      <div v-if="article.coverImage" class="img-zoom group mt-8 overflow-hidden rounded-2xl border border-line">
        <img :src="article.coverImage" :alt="article.title" class="w-full object-cover" />
      </div>
      <!-- eslint-disable-next-line vue/no-v-html — sanitized server-side on write -->
      <div class="prose-site mt-8 text-lg" v-html="article.content" />
    </div>
  </article>
</template>
