<script setup lang="ts">
const route = useRoute()
const { data: ev } = await useFetch(`/api/public/events/${route.params.slug}`)

if (!ev.value) {
  throw createError({ statusCode: 404, statusMessage: 'Event not found', fatal: true })
}

useSeoMeta({
  title: ev.value.title,
  description: `${ev.value.title}: competitions, results and photos.`,
  ogImage: ev.value.heroImage ?? undefined,
})
</script>

<template>
  <div v-if="ev">
    <section class="relative overflow-hidden">
      <div class="hero-field" aria-hidden="true"><div class="float-blob float-blob-1" /></div>
      <div class="container-site pb-10 pt-8">
        <SiteBackButton to="/events" label="All editions" />
        <div class="mt-8 max-w-3xl">
          <p class="text-sm font-bold uppercase tracking-[0.18em] text-brand-600">
            {{ formatDateRange(ev.startDate, ev.endDate) }}<span v-if="ev.venue"> · {{ ev.venue }}</span>
          </p>
          <h1 class="text-display mt-3">{{ ev.title }}</h1>
          <!-- eslint-disable-next-line vue/no-v-html — sanitized server-side on write -->
          <div v-if="ev.description" class="prose-site mt-6" v-html="ev.description" />
        </div>
      </div>
    </section>

    <SiteSectionReveal v-if="ev.competitions.length">
      <section class="section !pt-4">
        <div class="container-site">
          <h2 class="text-title">Competitions held</h2>
          <div class="mt-6 grid gap-4" style="grid-template-columns: repeat(auto-fit, minmax(260px, 1fr))">
            <NuxtLink
              v-for="comp in ev.competitions"
              :key="comp.id"
              :to="`/competitions/${comp.slug}`"
              class="card card-hover group flex items-center justify-between p-5"
            >
              <div>
                <p class="font-extrabold tracking-tight">{{ comp.name }}</p>
                <p class="mt-0.5 text-sm text-ink-soft">{{ comp.type }}</p>
              </div>
              <Icon name="lucide:arrow-right" class="text-brand-600 transition-transform duration-150 group-hover:translate-x-1" />
            </NuxtLink>
          </div>
        </div>
      </section>
    </SiteSectionReveal>

    <SiteSectionReveal v-if="ev.gallery.length">
      <section class="section !pt-0">
        <div class="container-site">
          <h2 class="text-title">Gallery</h2>
          <div class="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            <figure v-for="img in ev.gallery" :key="img.id" class="img-zoom group card overflow-hidden">
              <img :src="img.url" :alt="img.caption ?? ev.title" loading="lazy" class="aspect-[4/3] w-full object-cover" />
              <figcaption v-if="img.caption" class="px-3 py-2 text-xs text-ink-soft">{{ img.caption }}</figcaption>
            </figure>
          </div>
        </div>
      </section>
    </SiteSectionReveal>
  </div>
</template>
