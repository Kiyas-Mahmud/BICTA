<script setup lang="ts">
defineProps<{
  article: {
    title: string
    slug: string
    excerpt: string
    coverImage?: string | null
    publishedAt?: string | null
  }
}>()
</script>

<template>
  <NuxtLink :to="`/news/${article.slug}`" class="card card-hover group flex flex-col overflow-hidden">
    <div class="img-zoom aspect-[16/9] w-full overflow-hidden bg-mist-2">
      <img
        v-if="article.coverImage"
        :src="article.coverImage"
        :alt="article.title"
        loading="lazy"
        class="h-full w-full object-cover"
      />
      <div v-else class="flex h-full w-full items-center justify-center text-ink-faint">
        <Icon name="lucide:newspaper" class="text-3xl" />
      </div>
    </div>
    <div class="flex flex-1 flex-col p-5">
      <p class="flex items-center gap-1.5 text-xs font-semibold text-ink-faint">
        <Icon name="lucide:calendar" /> {{ formatDate(article.publishedAt) }}
      </p>
      <h3 class="mt-2 font-extrabold leading-snug tracking-tight transition-colors group-hover:text-brand-600">{{ article.title }}</h3>
      <p class="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-soft">{{ article.excerpt }}</p>
      <span class="mt-3 flex items-center gap-1.5 text-sm font-bold text-brand-600">
        Read more
        <Icon name="lucide:arrow-right" class="transition-transform duration-150 group-hover:translate-x-1" />
      </span>
    </div>
  </NuxtLink>
</template>
