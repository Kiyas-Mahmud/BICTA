<script setup lang="ts">
import { Swiper, SwiperSlide } from 'swiper/vue'
import { Autoplay, Grid, FreeMode } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/grid'
import 'swiper/css/free-mode'
import { useNews } from '~/composables/useNews'

const { data: articles } = await useFetch('/api/public/news')
useSeoMeta({ title: 'News', description: 'Announcements and updates from BICTA.' })

const { news } = useNews()
const newsItems = news
</script>

<template>
  <div>
    <section class="section bg-mist-1 pb-0">
      <div class="container-site">
        <SiteBackButton to="/" label="Back to home" />
        <h1 class="text-display mt-6">News</h1>
        <p class="mt-3 text-lg text-ink-soft">Announcements and updates.</p>
      </div>
    </section>

    <!-- Recent News Swiper (from Homepage) -->
    <section class="section overflow-hidden bg-mist-1 !pb-4">
      <div class="container-site">
        <h2 class="text-title">Featured Highlights</h2>
        <div class="mt-8">
          <ClientOnly>
            <Swiper
              :slides-per-view="1"
              :grid="{ rows: 2, fill: 'row' }"
              :space-between="16"
              :free-mode="true"
              :speed="8000"
              :autoplay="{ delay: 0, disableOnInteraction: false }"
              :modules="[Grid, Autoplay, FreeMode]"
              :breakpoints="{
                0: { slidesPerView: 1, grid: { rows: 1 } },
                640: { slidesPerView: 2, grid: { rows: 2 } },
                1024: { slidesPerView: 4, grid: { rows: 2 } },
              }"
              class="news-swiper continuous-swiper !pb-12"
            >
              <SwiperSlide v-for="item in newsItems" :key="item.id">
                <NuxtLink :to="item.url" class="card card-hover group flex h-full flex-col overflow-hidden bg-white">
                  <div class="img-zoom aspect-[16/9] w-full overflow-hidden bg-mist-2">
                    <img :src="item.imageUrl" :alt="item.title" loading="lazy" class="h-full w-full object-cover" />
                  </div>
                  <div class="flex flex-1 flex-col p-4">
                    <div class="flex items-center gap-2">
                      <span class="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700">
                        {{ item.category }}
                      </span>
                      <span class="text-xs text-ink-faint">{{ formatDate(item.date) }}</span>
                    </div>
                    <h3 class="mt-2 text-sm font-extrabold leading-snug tracking-tight transition-colors group-hover:text-brand-600">
                      {{ item.title }}
                    </h3>
                    <p class="mt-1.5 line-clamp-2 text-xs leading-relaxed text-ink-soft">{{ item.excerpt }}</p>
                  </div>
                </NuxtLink>
              </SwiperSlide>
            </Swiper>
          </ClientOnly>
        </div>
      </div>
    </section>

    <!-- All News Grid -->
    <section class="section border-t border-line">
      <div class="container-site">
        <h2 class="text-title mb-8">All Announcements</h2>
        <div v-if="articles?.length" class="grid gap-5" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))">
          <SiteNewsCard v-for="article in articles" :key="article.id" :article="article" />
        </div>
        <div v-else class="mt-8 text-center text-ink-faint">No news yet. Check back soon.</div>
      </div>
    </section>
  </div>
</template>

<style>
.continuous-swiper .swiper-wrapper {
  transition-timing-function: linear !important;
}
</style>
