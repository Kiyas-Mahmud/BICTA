<script setup lang="ts">
import { Swiper, SwiperSlide } from 'swiper/vue'
import { EffectCoverflow, Pagination, Autoplay, Grid, FreeMode } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/effect-coverflow'
import 'swiper/css/pagination'
import 'swiper/css/grid'
import type { HackathonEvent } from '~/composables/useEvents'

const { data } = await useFetch('/api/public/home')

const current = computed(() => data.value?.current)
const settings = computed<Record<string, string>>(() => data.value?.settings ?? {})
function s(key: string, fallback = '') { return settings.value[key] || fallback }
function visible(name: string) { return settings.value[`section_${name}_visible`] !== '0' }

const tagline = computed(() => s('hero_tagline', 'Innovate. Code. Compete. Inspire.'))

// Hero title: split trailing year so it can be colored, like the reference.
const titleParts = computed(() => {
  const t = current.value?.title ?? 'BICTA'
  const m = t.match(/^(.*?)(\d{4})\s*$/)
  return m ? { main: m[1].trim(), year: m[2] } : { main: t, year: '' }
})

const stats = computed(() => [
  { icon: 'lucide:users', value: s('stat_participants', '2,340+'), label: 'Participants', tile: 'tile-blue' },
  { icon: 'lucide:users-round', value: s('stat_teams', '420+'), label: 'Teams', tile: 'tile-purple' },
  { icon: 'lucide:graduation-cap', value: s('stat_universities', '65+'), label: 'Universities', tile: 'tile-green' },
  { icon: 'lucide:trophy', value: String(current.value?.competitions.length ?? 0), label: 'Competitions', tile: 'tile-orange' },
])

// Featured events from dummy data
const featuredEvents = useFeaturedEvents()

// News from dummy data
const { news: newsItems } = useNews()

function statusBadgeClass(status: HackathonEvent['status']) {
  switch (status) {
    case 'ongoing': return 'bg-emerald-500/90 text-white'
    case 'upcoming': return 'bg-blue-500/90 text-white'
    case 'past': return 'bg-gray-500/90 text-white'
  }
}

useSeoMeta({
  title: current.value ? `${current.value.title}, the national ICT programming festival` : undefined,
  description: tagline.value,
})
</script>

<template>
  <div>
    <!-- 1. HERO -->
    <section class="relative overflow-hidden">
      <div class="hero-field" aria-hidden="true">
        <div class="float-blob float-blob-1" />
        <div class="float-blob float-blob-2" />
      </div>

      <div class="container-site grid items-center gap-10 pb-12 pt-28 lg:grid-cols-2 lg:pb-20 lg:pt-32">
        <div>
          <span class="eyebrow rise rise-1">{{ s('hero_eyebrow', 'National ICT Programming Festival') }}</span>
          <h1 class="text-display rise rise-2 mt-5">
            {{ titleParts.main }}
            <span v-if="titleParts.year" class="text-brand-600">{{ titleParts.year }}</span>
          </h1>
          <p class="rise rise-2 mt-4 text-xl font-bold text-ink">{{ tagline }}</p>
          <p class="rise rise-3 mt-3 max-w-md text-ink-soft" v-if="s('hero_blurb')">{{ s('hero_blurb') }}</p>
          <p class="rise rise-3 mt-3 max-w-md text-ink-soft" v-else>
            The biggest national ICT programming festival with three tracks, a bigger prize pool, and a national stage for innovators.
          </p>
          <div class="rise rise-4 mt-8 flex flex-wrap items-center gap-3">
            <NuxtLink to="/events" class="btn-primary">Explore Competitions <Icon name="lucide:arrow-right" /></NuxtLink>
            <a href="#why" class="btn-secondary">Learn More</a>
          </div>
        </div>

        <!-- floating skyline artwork (brand line-art) -->
        <div class="rise rise-4 relative hidden lg:block">
          <div class="floating">
            <svg viewBox="0 0 520 300" class="w-full" role="img" aria-label="City skyline illustration">
              <defs>
                <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#dbe8fe" />
                  <stop offset="100%" stop-color="#eff5ff" stop-opacity="0" />
                </linearGradient>
              </defs>
              <circle cx="400" cy="70" r="46" fill="#dbe8fe" />
              <g fill="#bfd7fe">
                <rect x="40" y="150" width="40" height="110" rx="4" />
                <rect x="300" y="120" width="44" height="140" rx="4" />
                <rect x="460" y="160" width="34" height="100" rx="4" />
              </g>
              <g fill="#609afa">
                <rect x="90" y="110" width="46" height="150" rx="4" />
                <rect x="250" y="90" width="44" height="170" rx="4" />
                <rect x="410" y="130" width="44" height="130" rx="4" />
              </g>
              <g fill="#2563eb">
                <rect x="150" y="70" width="50" height="190" rx="5" />
                <rect x="210" y="40" width="34" height="220" rx="5" />
                <rect x="356" y="100" width="48" height="160" rx="5" />
              </g>
              <g fill="#fff" opacity="0.7">
                <rect x="162" y="90" width="6" height="6" /><rect x="178" y="90" width="6" height="6" />
                <rect x="162" y="110" width="6" height="6" /><rect x="178" y="110" width="6" height="6" />
                <rect x="368" y="120" width="6" height="6" /><rect x="384" y="120" width="6" height="6" />
                <rect x="220" y="70" width="6" height="6" /><rect x="220" y="90" width="6" height="6" />
              </g>
              <rect x="0" y="258" width="520" height="2" fill="#93bbfd" />
            </svg>
          </div>
        </div>
      </div>
    </section>

    <!-- 2. STATS BAR -->
    <section>
      <div class="py-12 md:py-20 relative z-10">
        <div class="container-site">
          <h2 class="sr-only">BICTA in stats</h2>
          <div class="grid grid-cols-2 gap-8 md:grid-cols-4 card p-8 shadow-xl bg-white/70 backdrop-blur-xl border-white/40">
            <div v-for="st in stats" :key="st.label" class="space-y-1 text-center">
              <div class="text-brand-600 text-4xl font-bold">{{ st.value }}</div>
              <p class="text-ink-soft">{{ st.label }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 3. WHY JOIN -->
    <SiteSectionReveal v-if="visible('why') && data?.features?.length">
      <section id="why" class="section">
        <div class="container-site">
          <div class="mx-auto max-w-2xl text-center">
            <h2 class="text-title">{{ s('why_heading', 'Why join BICTA') }}</h2>
            <p v-if="s('why_subtext')" class="mt-3 text-ink-soft">{{ s('why_subtext') }}</p>
          </div>
          <SiteFeatureGrid class="mt-10" :features="data!.features" />
        </div>
      </section>
    </SiteSectionReveal>

    <!-- 4. COMPETITIONS -->
    <SiteSectionReveal v-if="current?.competitions.length">
      <section id="competitions" class="section !pt-0">
        <div class="container-site">
          <div class="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 class="text-title">Competitions</h2>
              <p class="mt-2 text-ink-soft">Pick your arena. Each track has its own rules and prizes.</p>
            </div>
            <a href="#competitions" class="link-underline text-sm text-brand-600">View all competitions</a>
          </div>
          <div class="mt-8 grid gap-5" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))">
            <SiteCompetitionCard v-for="(comp, i) in current.competitions" :key="comp.id" :competition="comp" :index="i" />
          </div>
        </div>
      </section>
    </SiteSectionReveal>

    <!-- 4.2 WHY JOIN -->
    <SiteWhyJoin />

    <!-- 4.5 FEATURED EVENTS — Coverflow Swiper + TiltCard -->
    <SiteSectionReveal v-if="featuredEvents.length">
      <section class="section !pt-0">
        <div class="container-site">
          <div class="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 class="text-title">Featured Events</h2>
              <p class="mt-2 text-ink-soft">Don't miss these hackathons and competitions.</p>
            </div>
            <NuxtLink to="/events" class="link-underline text-sm text-brand-600">View all events</NuxtLink>
          </div>
          <div class="mt-8">
            <ClientOnly>
              <Swiper
                effect="coverflow"
                :grab-cursor="true"
                :centered-slides="true"
                :slides-per-view="'auto'"
                :coverflow-effect="{ rotate: 50, stretch: 0, depth: 100, modifier: 1, slideShadows: true }"
                :pagination="{ clickable: true }"
                :autoplay="{ delay: 3000, disableOnInteraction: false }"
                :modules="[EffectCoverflow, Pagination, Autoplay]"
                class="featured-swiper !pb-12"
              >
                <SwiperSlide
                  v-for="event in featuredEvents"
                  :key="event.id"
                  class="!w-[320px] sm:!w-[380px] md:!w-[420px]"
                >
                  <UiTiltCard :max="8">
                    <NuxtLink :to="`/events/${event.id}`" class="group block">
                      <div class="relative aspect-[16/10] overflow-hidden rounded-2xl">
                        <img
                          :src="event.imageUrl"
                          :alt="event.title"
                          class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <!-- Gradient overlay -->
                        <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                        <!-- Status badge -->
                        <span
                          class="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold backdrop-blur-sm"
                          :class="statusBadgeClass(event.status)"
                        >
                          {{ event.status.charAt(0).toUpperCase() + event.status.slice(1) }}
                        </span>
                        <!-- Prize badge -->
                        <span class="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-brand-600 backdrop-blur-sm">
                          <Icon name="lucide:trophy" class="text-xs" /> {{ event.prize }}
                        </span>
                        <!-- Content -->
                        <div class="absolute inset-x-0 bottom-0 p-4">
                          <p class="text-xs font-semibold text-white/70">
                            {{ formatDateRange(event.startDate, event.endDate) }}
                          </p>
                          <h3 class="mt-1 text-lg font-extrabold leading-tight text-white">
                            {{ event.title }}
                          </h3>
                        </div>
                      </div>
                    </NuxtLink>
                  </UiTiltCard>
                </SwiperSlide>
              </Swiper>
            </ClientOnly>
          </div>
        </div>
      </section>
    </SiteSectionReveal>

    <!-- 4.6 SPONSORS -->
    <SiteHomeSponsors />

    <!-- 5. IMPORTANT DATES -->
    <SiteSectionReveal v-if="visible('timeline')">
      <section class="section !pt-0">
        <div class="container-site">
          <div class="flex flex-wrap items-end justify-between gap-3">
            <h2 class="text-title">Important dates</h2>
            <NuxtLink to="/events" class="link-underline text-sm text-brand-600">View full timeline</NuxtLink>
          </div>
          <div class="mt-16">
            <SiteImportantDates :items="[
              { id: '1', timestamp: '2026-07-01T00:00:00Z', title: 'Registration opens', description: 'Sign up for any track.', status: 'pending' },
              { id: '2', timestamp: '2026-08-31T00:00:00Z', title: 'Registration deadline', description: 'Last day to register.', status: 'pending' },
              { id: '3', timestamp: '2026-09-10T00:00:00Z', title: 'Opening ceremony', description: 'Kickoff in Dhaka.', status: 'pending' },
              { id: '4', timestamp: '2026-09-12T00:00:00Z', title: 'Finals & awards', description: 'Winners announced.', status: 'pending' }
            ]" />
          </div>
        </div>
      </section>
    </SiteSectionReveal>

    <!-- 6. PARTNERS -->
    <SiteSectionReveal v-if="visible('sponsors') && data?.sponsors?.length">
      <section class="section !pt-0">
        <div class="container-site">
          <h2 class="text-title text-center">{{ s('sponsors_heading', 'Our partners') }}</h2>
          <SiteSponsorWall class="mt-8" :sponsors="data!.sponsors" />
        </div>
      </section>
    </SiteSectionReveal>

    <!-- 7. JUDGES & SPEAKERS -->
    <SiteSectionReveal v-if="visible('people')">
      <section class="section !pt-0">
        <div class="container-site">
          <div class="flex flex-wrap items-end justify-between gap-3">
            <h2 class="text-title">Judges & speakers</h2>
          </div>
          <SitePeopleMarquee class="mt-8" :people="[
            { id: 1, name: 'Tanvir Hasan', title: 'Founder & CEO', organization: 'DataWorks', photoUrl: null, bio: '', role: 'judge' },
            { id: 2, name: 'Nadia Islam', title: 'Principal Engineer', organization: 'CloudBD', photoUrl: null, bio: '', role: 'judge' },
            { id: 3, name: 'Dr. Jerif Allision', title: 'Head of AI', organization: 'TechCorp', photoUrl: 'https://i.pravatar.cc/150?u=jerif', bio: '', role: 'speaker' }
          ]" />
        </div>
      </section>
    </SiteSectionReveal>



    <!-- 8.5 HOW IT WORKS -->
    <SiteHowItWorks />

    <!-- 9. LATEST NEWS — Swiper Grid -->
    <SiteSectionReveal v-if="newsItems.length">
      <section class="section !pt-0">
        <div class="container-site">
          <div class="flex flex-wrap items-end justify-between gap-3">
            <h2 class="text-title">Latest news</h2>
            <NuxtLink to="/news" class="link-underline text-sm text-brand-600">All news</NuxtLink>
          </div>
          <div class="mt-8">
            <ClientOnly>
              <Swiper
                :slides-per-view="4"
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
                  <NuxtLink :to="item.url" class="card card-hover group flex h-full flex-col overflow-hidden">
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
    </SiteSectionReveal>

    <!-- Also show DB news if available and different -->
    <SiteSectionReveal v-if="data?.news?.length">
      <section class="section !pt-0">
        <div class="container-site">
          <div class="flex flex-wrap items-end justify-between gap-3">
            <h2 class="text-title">Announcements</h2>
            <NuxtLink to="/news" class="link-underline text-sm text-brand-600">All news</NuxtLink>
          </div>
          <div class="mt-8 grid gap-5" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))">
            <SiteNewsCard v-for="article in data!.news" :key="article.id" :article="article" />
          </div>
        </div>
      </section>
    </SiteSectionReveal>

    <!-- 8. MEDIA GALLERY -->
    <SiteSectionReveal v-if="visible('gallery')">
      <section class="section !pt-0">
        <div class="container-site">
          <div class="flex flex-wrap items-end justify-between gap-3 mb-8">
            <h2 class="text-title">{{ s('gallery_heading', 'Media gallery') }}</h2>
            <NuxtLink to="/gallery" class="link-underline text-sm text-brand-600">View full gallery</NuxtLink>
          </div>
          <UiImageGallery :images="[
            '/gallery-images/hackathons.jpg',
            '/gallery-images/images (1).jpg',
            '/gallery-images/images (2).jpg',
            '/gallery-images/images (3).jpg',
            '/gallery-images/images (4).jpg',
            '/gallery-images/images.jpg',
            '/gallery-images/photo-1624996752380-8ec242e0f85d.avif',
            '/gallery-images/photo-1688733720228-4f7a18681c4f.avif'
          ]" />
        </div>
      </section>
    </SiteSectionReveal>

    <!-- 10. PREVIOUS WINNERS -->
    <SiteSectionReveal v-if="visible('winners') && data?.winners?.length">
      <section class="section !pt-0">
        <div class="container-site">
          <div class="flex flex-wrap items-end justify-between gap-3">
            <h2 class="text-title">{{ s('winners_heading', 'Previous winners') }}</h2>
          </div>
          <div class="mt-8 grid gap-5" style="grid-template-columns: repeat(auto-fit, minmax(300px, 1fr))">
            <SiteWinnerCard v-for="w in data!.winners" :key="w.id" :winner="w" />
          </div>
        </div>
      </section>
    </SiteSectionReveal>

    <!-- 11 + 12. FAQ + VENUE -->
    <SiteSectionReveal v-if="(visible('faq') && data?.faqs?.length) || (visible('venue') && (s('venue_name') || s('venue_map_embed')))">
      <section class="section !pt-0">
        <div class="container-site grid gap-10 lg:grid-cols-2">
          <div v-if="visible('faq') && data?.faqs?.length">
            <h2 class="text-title">{{ s('faq_heading', 'Frequently asked questions') }}</h2>
            <SiteFaqAccordion class="mt-6" :faqs="data!.faqs" />
          </div>
          <div v-if="visible('venue') && (s('venue_name') || s('venue_map_embed'))">
            <h2 class="text-title">{{ s('venue_heading', 'Venue & location') }}</h2>
            <SiteVenueMap
              class="mt-6"
              :name="s('venue_name')"
              :address="s('venue_address')"
              :directions="s('venue_directions')"
              :map-embed="s('venue_map_embed')"
            />
          </div>
        </div>
      </section>
    </SiteSectionReveal>

    <!-- NEW TESTIMONIALS COMPONENT -->
    <SiteTestimonials />

    <!-- NEW FAQS COMPONENT -->
    <SiteFaqs />

    <!-- 12.5 CONTACT CARD -->
    <SiteSectionReveal v-if="visible('contact_section') !== false">
      <section class="section !pt-0">
        <div class="container-site">
          <UiContactCard
            title="Get in touch"
            description="If you have any questions regarding our Services or need help, please fill out the form here. We do our best to respond within 1 business day."
            :contact-info="[
              { icon: 'lucide:mail', label: 'Email', value: s('contact_email') || 'contact@bicta.com' },
              { icon: 'lucide:phone', label: 'Phone', value: '+880 1234 567890' },
              { icon: 'lucide:map-pin', label: 'Address', value: s('venue_address') || 'Dhaka, Bangladesh', className: 'col-span-2 sm:col-span-1 xl:col-span-2' }
            ]"
          >
            <form @submit.prevent="" class="w-full space-y-4">
              <div class="flex flex-col gap-2">
                <UiLabel>Name</UiLabel>
                <UiInput type="text" placeholder="Your name" />
              </div>
              <div class="flex flex-col gap-2">
                <UiLabel>Email</UiLabel>
                <UiInput type="email" placeholder="you@email.com" />
              </div>
              <div class="flex flex-col gap-2">
                <UiLabel>Phone</UiLabel>
                <UiInput type="tel" placeholder="Optional" />
              </div>
              <div class="flex flex-col gap-2">
                <UiLabel>Message</UiLabel>
                <UiTextarea placeholder="How can we help?" />
              </div>
              <UiButton class="w-full mt-2" type="button">
                Submit
              </UiButton>
            </form>
          </UiContactCard>
        </div>
      </section>
    </SiteSectionReveal>

  </div>
</template>

<style>
.continuous-swiper .swiper-wrapper {
  transition-timing-function: linear !important;
}
</style>
