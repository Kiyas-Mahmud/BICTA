<script setup lang="ts">
import { Swiper, SwiperSlide } from 'swiper/vue'
import { EffectCoverflow, Pagination, Autoplay } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/effect-coverflow'
import 'swiper/css/pagination'
import type { HackathonEvent } from '~/composables/useEvents'
import type { TimelineItem } from '~/components/site/Timeline.vue'

const { data } = await useFetch('/api/public/home')

const current = computed(() => data.value?.current)
const settings = computed<Record<string, string>>(() => data.value?.settings ?? {})
function s(key: string, fallback = '') { return settings.value[key] || fallback }
function visible(name: string) { return settings.value[`section_${name}_visible`] !== '0' }

const tagline = computed(() => s('hero_tagline', 'Innovate. Code. Compete. Inspire.'))

// Hero title: split trailing year so it can be colored.
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

// Competitions carousel — DB-backed via the content plugin.
const featuredEvents = useFeaturedEvents()

function statusBadge(status: HackathonEvent['status']) {
  if (status === 'ongoing') return { class: 'pill-open', label: 'Live', dot: true }
  if (status === 'upcoming') return { class: 'badge badge-blue', label: 'Upcoming', dot: false }
  return { class: 'badge badge-gray', label: 'Past', dot: false }
}

// timeline_milestones rows -> TimelineItem, status derived from today.
const timelineItems = computed<TimelineItem[]>(() => {
  const rows = data.value?.timeline ?? []
  const today = new Date().toISOString().slice(0, 10)
  const firstUpcoming = rows.findIndex((r: any) => (r.date ?? '') >= today)
  return rows.map((r: any, i: number) => ({
    id: String(r.id),
    title: r.label,
    description: r.note ?? '',
    timestamp: r.date ?? '',
    status: firstUpcoming === -1 || i < firstUpcoming ? 'completed' : i === firstUpcoming ? 'active' : 'pending',
  }))
})

const marqueePeople = computed(() => [...(data.value?.judges ?? []), ...(data.value?.speakers ?? [])])
const galleryImages = computed(() => (data.value?.gallery ?? []).map((g: any) => g.url))

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
          <p class="rise rise-3 mt-3 max-w-md text-ink-soft">
            {{ s('hero_blurb', 'The biggest national ICT programming festival with three tracks, a bigger prize pool, and a national stage for innovators.') }}
          </p>
          <div class="rise rise-4 mt-8 flex flex-wrap items-center gap-3">
            <NuxtLink to="/events" class="btn-primary">Explore Competitions <Icon name="lucide:arrow-right" /></NuxtLink>
            <a href="#why" class="btn-secondary">Learn More</a>
          </div>
        </div>

        <!-- floating skyline artwork (brand palette via fill utilities) -->
        <div class="rise rise-4 relative hidden lg:block">
          <div class="floating">
            <svg viewBox="0 0 520 300" class="w-full" role="img" aria-label="City skyline illustration">
              <circle cx="400" cy="70" r="46" class="fill-brand-100" />
              <g class="fill-brand-200">
                <rect x="40" y="150" width="40" height="110" rx="4" />
                <rect x="300" y="120" width="44" height="140" rx="4" />
                <rect x="460" y="160" width="34" height="100" rx="4" />
              </g>
              <g class="fill-brand-400">
                <rect x="90" y="110" width="46" height="150" rx="4" />
                <rect x="250" y="90" width="44" height="170" rx="4" />
                <rect x="410" y="130" width="44" height="130" rx="4" />
              </g>
              <g class="fill-brand-600">
                <rect x="150" y="70" width="50" height="190" rx="5" />
                <rect x="210" y="40" width="34" height="220" rx="5" />
                <rect x="356" y="100" width="48" height="160" rx="5" />
              </g>
              <g class="fill-white" opacity="0.7">
                <rect x="162" y="90" width="6" height="6" /><rect x="178" y="90" width="6" height="6" />
                <rect x="162" y="110" width="6" height="6" /><rect x="178" y="110" width="6" height="6" />
                <rect x="368" y="120" width="6" height="6" /><rect x="384" y="120" width="6" height="6" />
                <rect x="220" y="70" width="6" height="6" /><rect x="220" y="90" width="6" height="6" />
              </g>
              <rect x="0" y="258" width="520" height="2" class="fill-brand-300" />
            </svg>
          </div>
        </div>
      </div>
    </section>

    <!-- 2. COUNTDOWN + STATS -->
    <section class="container-site relative z-10 -mt-2 pb-4">
      <div class="card flex flex-col items-center gap-8 p-6 shadow-soft lg:flex-row lg:justify-between lg:p-8">
        <div v-if="current?.startDate" class="text-center lg:text-left">
          <p class="mb-3 text-sm font-bold uppercase tracking-wide text-ink-soft">Event starts in</p>
          <UiAnimatedNumberCountdown :end-date="current.startDate" />
        </div>
        <div class="h-px w-full bg-line lg:h-16 lg:w-px" />
        <div class="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-4">
          <div v-for="st in stats" :key="st.label" class="flex items-center gap-3">
            <span class="tile h-10 w-10 text-lg" :class="st.tile"><Icon :name="st.icon" /></span>
            <div>
              <p class="text-xl font-extrabold tracking-tight">{{ st.value }}</p>
              <p class="text-xs font-semibold text-ink-faint">{{ st.label }}</p>
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

    <!-- 4. COMPETITIONS (coverflow carousel, DB-backed) -->
    <SiteSectionReveal v-if="featuredEvents.length">
      <section id="competitions" class="section !pt-0">
        <div class="container-site">
          <div class="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 class="text-title">Competitions</h2>
              <p class="mt-2 text-ink-soft">Pick your arena. Each track has its own rules and prizes.</p>
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
                        <div class="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/30 to-transparent" />
                        <span class="absolute left-3 top-3" :class="statusBadge(event.status).class">
                          <span v-if="statusBadge(event.status).dot" class="dot-live" />
                          {{ statusBadge(event.status).label }}
                        </span>
                        <span class="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-brand-600 backdrop-blur-sm">
                          <Icon name="lucide:trophy" class="text-xs" /> {{ event.prize }}
                        </span>
                        <div class="absolute inset-x-0 bottom-0 p-4">
                          <p class="text-xs font-semibold text-white/70">
                            {{ formatDateRange(event.startDate, event.endDate) }}
                          </p>
                          <h3 class="mt-1 text-lg font-extrabold leading-tight text-white">{{ event.title }}</h3>
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

    <!-- 5. IMPORTANT DATES -->
    <SiteSectionReveal v-if="visible('timeline') && timelineItems.length">
      <section class="section !pt-0">
        <div class="container-site">
          <div class="mx-auto mb-12 max-w-2xl text-center">
            <h2 class="text-title">{{ s('timeline_heading', 'Important dates') }}</h2>
          </div>
          <SiteTimeline layout="horizontal" :items="timelineItems" />
        </div>
      </section>
    </SiteSectionReveal>

    <!-- 6. SPONSORS & PARTNERS -->
    <SiteSectionReveal v-if="visible('sponsors') && data?.sponsors?.length">
      <section class="section !pt-0">
        <div class="container-site">
          <h2 class="text-title text-center">{{ s('sponsors_heading', 'Our partners') }}</h2>
          <SiteSponsorWall class="mt-8" :sponsors="data!.sponsors" />
        </div>
      </section>
    </SiteSectionReveal>

    <!-- 7. JUDGES & SPEAKERS -->
    <SiteSectionReveal v-if="visible('people') && marqueePeople.length">
      <section class="section !pt-0">
        <div class="container-site">
          <h2 class="text-title">{{ s('people_heading', 'Judges & speakers') }}</h2>
          <SitePeopleMarquee class="mt-8" :people="marqueePeople" />
        </div>
      </section>
    </SiteSectionReveal>

    <!-- 8. HOW IT WORKS -->
    <SiteSectionReveal v-if="data?.steps?.length">
      <section class="section !pt-0">
        <div class="container-site">
          <div class="mx-auto mb-12 max-w-2xl text-center">
            <h2 class="text-title">How it works</h2>
            <p class="mt-3 text-ink-soft">From registration to the final pitch, here is your journey to the national stage.</p>
          </div>
          <SiteHowItWorks :steps="data!.steps" />
        </div>
      </section>
    </SiteSectionReveal>

    <!-- 9. MEDIA GALLERY -->
    <SiteSectionReveal v-if="visible('gallery') && galleryImages.length">
      <section class="section !pt-0">
        <div class="container-site">
          <div class="mb-8 flex flex-wrap items-end justify-between gap-3">
            <h2 class="text-title">{{ s('gallery_heading', 'Media gallery') }}</h2>
            <NuxtLink to="/gallery" class="link-underline text-sm text-brand-600">View full gallery</NuxtLink>
          </div>
          <UiImageGallery :images="galleryImages" />
        </div>
      </section>
    </SiteSectionReveal>

    <!-- 10. LATEST NEWS -->
    <SiteSectionReveal v-if="data?.news?.length">
      <section class="section !pt-0">
        <div class="container-site">
          <div class="flex flex-wrap items-end justify-between gap-3">
            <h2 class="text-title">Latest news</h2>
            <NuxtLink to="/news" class="link-underline text-sm text-brand-600">All news</NuxtLink>
          </div>
          <div class="mt-8 grid gap-5" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))">
            <SiteNewsCard v-for="article in data!.news" :key="article.id" :article="article" />
          </div>
        </div>
      </section>
    </SiteSectionReveal>

    <!-- 11. PREVIOUS WINNERS -->
    <SiteSectionReveal v-if="visible('winners') && data?.winners?.length">
      <section class="section !pt-0">
        <div class="container-site">
          <h2 class="text-title">{{ s('winners_heading', 'Previous winners') }}</h2>
          <div class="mt-8 grid gap-5" style="grid-template-columns: repeat(auto-fit, minmax(300px, 1fr))">
            <SiteWinnerCard v-for="w in data!.winners" :key="w.id" :winner="w" />
          </div>
        </div>
      </section>
    </SiteSectionReveal>

    <!-- 12. TESTIMONIALS -->
    <SiteSectionReveal v-if="data?.testimonials?.length">
      <section class="section !pt-0">
        <div class="container-site">
          <div class="mx-auto mb-10 max-w-2xl text-center">
            <h2 class="text-title">Don't just take our word for it</h2>
            <p class="mt-3 text-ink-soft">Hear from past participants who experienced BICTA firsthand.</p>
          </div>
          <SiteTestimonials :items="data!.testimonials" />
        </div>
      </section>
    </SiteSectionReveal>

    <!-- 13. FAQ + VENUE -->
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

    <!-- 14. CONTACT -->
    <SiteSectionReveal>
      <section class="section !pt-0">
        <div class="container-site">
          <UiContactCard
            title="Get in touch"
            description="Questions about the festival, sponsorship, or partnerships? Fill out the form and we will respond within one business day."
            :contact-info="[
              { icon: 'lucide:mail', label: 'Email', value: s('contact_email', 'hello@bicta.example') },
              { icon: 'lucide:map-pin', label: 'Venue', value: s('venue_name', 'Dhaka, Bangladesh'), className: 'sm:col-span-1 xl:col-span-2' },
            ]"
          >
            <SiteContactForm />
          </UiContactCard>
        </div>
      </section>
    </SiteSectionReveal>

    <!-- 15. NEWSLETTER -->
    <SiteSectionReveal v-if="visible('newsletter')">
      <section class="section !pt-0">
        <div class="container-site">
          <SiteNewsletterSignup>
            <p class="text-lg font-extrabold text-white">{{ s('newsletter_heading', 'Stay updated with BICTA') }}</p>
            <p v-if="s('newsletter_subtext')" class="mt-0.5 text-sm text-white/80">{{ s('newsletter_subtext') }}</p>
          </SiteNewsletterSignup>
        </div>
      </section>
    </SiteSectionReveal>
  </div>
</template>
