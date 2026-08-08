<script setup lang="ts">
import type { EventListing } from '~/composables/useEvents'

const { data } = await useFetch('/api/public/home')

const current = computed(() => data.value?.current)
const settings = computed<Record<string, string>>(() => data.value?.settings ?? {})
function s(key: string, fallback = '') { return settings.value[key] || fallback }
function visible(name: string) { return settings.value[`section_${name}_visible`] !== '0' }

const tagline = computed(() => s('hero_tagline', 'Innovate. Code. Compete. Inspire.'))
const fullName = computed(() => s('hero_full_name', 'Bangladesh ICT Alliance'))

// Only rows the admin has actually filled in. These previously fell back to a
// placeholder email and city, which meant a fresh install published a fake
// contact address as if it were real.
//
// No separate "Venue" row here: the full SiteVenueMap card now sits directly
// above this card in the same section, so a second, text-only mention of the
// same venue name right underneath it would just be a redundant echo.
const contactInfo = computed(() =>
  [{ icon: 'lucide:mail', label: 'Email', value: s('contact_email') }].filter((row) => Boolean(row.value)),
)
const hasVenue = computed(() => visible('venue') && Boolean(s('venue_name') || s('venue_map_embed')))

// Hero title: the admin-set brand name wins; otherwise fall back to the
// current event's title with any trailing year stripped ("BICTA 2026" ->
// "BICTA"), since the full name line below carries the edition context.
const heroTitle = computed(() => s('brand_name') || (current.value?.title ?? 'BICTA').replace(/\s*\d{4}\s*$/, ''))

// Real counts from the DB (server/utils/queries.ts#getEventStats) — no
// admin-editable placeholder numbers.
const eventStats = computed(() => data.value?.stats ?? { participants: 0, teams: 0, universities: 0 })
const stats = computed(() => [
  { icon: 'lucide:users', value: eventStats.value.participants.toLocaleString(), label: 'Participants', tile: 'tile-blue' },
  { icon: 'lucide:users-round', value: eventStats.value.teams.toLocaleString(), label: 'Teams', tile: 'tile-purple' },
  { icon: 'lucide:graduation-cap', value: eventStats.value.universities.toLocaleString(), label: 'Universities', tile: 'tile-green' },
  { icon: 'lucide:trophy', value: String(current.value?.competitions.length ?? 0), label: 'Competitions', tile: 'tile-orange' },
])

// Events — one card per yearly edition (competitions live on the event page).
// Non-past editions lead, newest year first; the first one gets the big card.
const { events: allEvents } = useEvents()
const orderedEvents = computed(() =>
  [...allEvents.value].sort((a, b) => {
    const rank = (e: EventListing) => (e.status === 'past' ? 1 : 0)
    return rank(a) - rank(b) || b.year - a.year
  }),
)
const leadEvent = computed(() => orderedEvents.value[0])
const otherEvents = computed(() => orderedEvents.value.slice(1))

function statusBadge(status: EventListing['status']) {
  if (status === 'ongoing') return { class: 'pill-open', label: 'Live', dot: true }
  if (status === 'upcoming') return { class: 'badge badge-blue', label: 'Upcoming', dot: false }
  return { class: 'badge badge-gray', label: 'Past', dot: false }
}
function openCount(e: EventListing) {
  return e.competitions.filter((c) => c.registrationOpen).length
}

const marqueePeople = computed(() => [...(data.value?.judges ?? []), ...(data.value?.speakers ?? [])])
const galleryImages = computed(() => (data.value?.gallery ?? []).map((g: any) => g.url))

// The hero image column is driven *only* by the event's own hero image, set on
// the event in admin. It used to fall back to gallery photos, which meant
// uploading pictures for the Gallery section silently turned the hero into a
// two-column layout -- a surprise, since those are two unrelated decisions.
// With no hero image set the column is dropped and the hero centres as a
// single column, rather than holding the space with a placeholder card.
const heroPhotos = computed(() => (current.value?.heroImage ? [current.value.heroImage] : []))
const hasHeroMedia = computed(() => heroPhotos.value.length > 0)
const topPrize = computed(() => current.value?.competitions?.[0]?.prizes?.[0]?.amount ?? '')
const registrationLive = computed(() => (current.value?.competitions ?? []).some((c: any) => c.registrationOpen))

// Editorial news split: one featured + compact list.
const featuredArticle = computed(() => data.value?.news?.[0])
const restArticles = computed(() => (data.value?.news ?? []).slice(1, 5))

// No title here on purpose: the root titleTemplate then renders the bare brand
// name, so the tab reads "BICTA" rather than the event's own headline. og:title
// is likewise inherited from app.vue. The description is echoed into
// og:description so link previews carry the same line the page already had.
useSeoMeta({
  description: () => tagline.value,
  ogDescription: () => tagline.value,
  twitterDescription: () => tagline.value,
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

      <div
        class="container-site pt-header-safe pt-header-safe--hero grid items-center gap-8 pb-10 sm:gap-10 sm:pb-12 lg:pb-20"
        :class="hasHeroMedia ? 'lg:grid-cols-2' : 'lg:grid-cols-1'"
      >
        <div :class="hasHeroMedia ? '' : 'mx-auto max-w-4xl text-center'">
          <span class="eyebrow eyebrow--hero rise rise-1">{{ s('hero_eyebrow', 'National ICT Programming Festival') }}</span>
          <h1 class="text-display text-display--hero rise rise-2 mt-3.5 sm:mt-5">
            {{ heroTitle }}
          </h1>
          <p v-if="fullName" class="rise rise-2 mt-2 text-2xl font-extrabold text-ink-soft sm:text-3xl lg:text-4xl">{{ fullName }}</p>
          <p class="rise rise-2 mt-3.5 text-lg font-bold text-ink-soft sm:mt-4 sm:text-2xl sm:text-ink lg:text-3xl">{{ tagline }}</p>
          <p
            class="rise rise-3 mt-3 text-base text-ink-soft sm:mt-4 sm:text-lg lg:text-xl"
            :class="hasHeroMedia ? 'max-w-lg' : 'mx-auto max-w-2xl'"
          >
            {{ s('hero_blurb', 'The biggest national ICT programming festival with three tracks, a bigger prize pool, and a national stage for innovators.') }}
          </p>

          <!-- Proof strip. The collage carries these signals on large screens, so
               it is mobile-only -- but with no collage there is nothing else to
               carry them, and it stays visible at every width. -->
          <div
            class="rise rise-3 mt-5 flex flex-wrap items-center gap-2"
            :class="hasHeroMedia ? 'lg:hidden' : 'justify-center'"
          >
            <span v-if="registrationLive" class="pill-open">
              <span class="dot-live" /> Registration open
            </span>
            <span v-if="topPrize" class="inline-flex items-center gap-1.5 rounded-full bg-mist-1 px-3 py-1 text-xs font-bold text-ink-soft">
              <Icon name="lucide:trophy" class="text-brand-600" /> {{ topPrize }} top prize
            </span>
          </div>

          <div
            class="rise rise-4 mt-7 flex w-full flex-col items-stretch gap-2.5 sm:mt-8 sm:w-auto sm:flex-row sm:items-center sm:gap-3"
            :class="hasHeroMedia ? '' : 'sm:justify-center'"
          >
            <NuxtLink to="/events" class="btn-primary hero-cta w-full justify-center text-center sm:w-auto">
              Explore Competitions <Icon name="lucide:arrow-right" />
            </NuxtLink>
            <a href="#why" class="btn-quiet w-full justify-center text-center sm:w-auto">Learn More</a>
          </div>
        </div>

        <!-- layered photo collage + floating stat chips; dropped entirely when
             nothing has been uploaded -->
        <div v-if="hasHeroMedia" class="rise rise-4 relative hidden min-h-[420px] lg:block">
          <!-- decorative dot grids -->
          <div class="dot-grid absolute -top-4 right-0 h-36 w-36 opacity-60" aria-hidden="true" />
          <div class="dot-grid absolute -bottom-8 left-6 h-28 w-28 opacity-40" aria-hidden="true" />

          <!-- main photo -->
          <div class="floating relative ml-auto w-[78%] rotate-2">
            <img
              :src="heroPhotos[0]"
              alt="Moments from BICTA"
              class="aspect-[4/3] w-full rounded-3xl border-4 border-white object-cover shadow-lift"
            />
            <span v-if="registrationLive" class="pill-open absolute right-4 top-4 shadow-soft">
              <span class="dot-live" /> Registration open
            </span>
          </div>
          <!-- secondary photo -->
          <img
            v-if="heroPhotos[1]"
            :src="heroPhotos[1]"
            alt="BICTA participants"
            class="floating-slow absolute -bottom-6 left-0 w-48 -rotate-3 rounded-2xl border-4 border-white object-cover shadow-lift"
          />

          <!-- prize chip -->
          <div v-if="topPrize" class="floating-delay card absolute left-0 top-10 flex items-center gap-3 p-4 shadow-lift">
            <span class="tile tile-orange h-10 w-10 text-lg"><Icon name="lucide:trophy" /></span>
            <div>
              <p class="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Top prize</p>
              <p class="text-base font-extrabold tracking-tight text-brand-600">{{ topPrize }}</p>
            </div>
          </div>

          <!-- participants chip — hidden until there are real participants,
               rather than advertising "0" on a site that has not opened yet -->
          <div v-if="eventStats.participants > 0" class="floating-slow card absolute -bottom-10 right-6 flex items-center gap-3 p-4 shadow-lift">
            <div class="flex -space-x-2.5">
              <span
                v-for="(p, i) in marqueePeople.slice(0, 3)"
                :key="i"
                class="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white text-xs font-extrabold"
                :class="['bg-brand-100 text-brand-700', 'bg-mist-2 text-ink-soft', 'bg-brand-600 text-white'][i % 3]"
              >
                {{ p.name.charAt(0) }}
              </span>
            </div>
            <div>
              <!-- Real count. This used to fall back to a hardcoded "2,340+"
                   via a stat_participants setting that no longer exists, so it
                   showed an invented number on every fresh install. -->
              <p class="text-base font-extrabold tracking-tight">{{ eventStats.participants }}</p>
              <p class="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Participants</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 2. COUNTDOWN + STATS -->
    <!-- Every figure here counts something belonging to the current event, so
         with no event the card was an empty shell of zeros beside a blank
         countdown slot. It follows the event. -->
    <section v-if="current" class="container-site relative z-10 pb-8 sm:pb-10">
      <div class="card flex flex-col gap-6 p-4 shadow-soft sm:gap-8 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
        <div v-if="current.startDate" class="w-full lg:w-auto">
          <p class="mb-3 text-center text-[0.7rem] font-bold uppercase tracking-[0.16em] text-ink-faint sm:text-xs lg:text-left">
            {{ current.title }} starts in
          </p>
          <UiAnimatedNumberCountdown :end-date="current.startDate" />
        </div>

        <!-- Separates the countdown from the stats, so it needs a countdown to
             separate: without this guard an event with no start date shows a
             rule floating above the stats on its own. -->
        <div v-if="current.startDate" class="h-px w-full bg-line/70 lg:h-20 lg:w-px" />

        <!-- stats: icon column aligned, value dominant, label quiet -->
        <div class="grid w-full grid-cols-2 gap-2 sm:grid-cols-4 lg:w-auto lg:gap-3">
          <div
            v-for="st in stats"
            :key="st.label"
            class="flex items-center gap-3 rounded-xl px-1 py-1.5 sm:px-2"
          >
            <span class="tile h-9 w-9 shrink-0 text-base sm:h-10 sm:w-10 sm:text-lg" :class="st.tile">
              <Icon :name="st.icon" />
            </span>
            <div class="min-w-0">
              <p class="truncate text-lg font-extrabold leading-none tracking-tight tabular-nums sm:text-xl">{{ st.value }}</p>
              <p class="mt-1 truncate text-[0.7rem] font-semibold text-ink-faint sm:text-xs">{{ st.label }}</p>
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

    <!-- 4. EVENTS (one card per yearly edition; competitions live inside) -->
    <SiteSectionReveal v-if="orderedEvents.length">
      <section id="competitions" class="section !pt-0">
        <div class="container-site">
          <div class="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <div>
              <div class="flex items-center gap-2.5">
                <h2 class="text-title">Events</h2>
                <span class="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700">
                  {{ orderedEvents.length }} {{ orderedEvents.length === 1 ? 'edition' : 'editions' }}
                </span>
              </div>
              <p class="mt-2 max-w-md text-ink-soft">Every edition of BICTA. Open one for its competitions, dates and prizes.</p>
            </div>
            <NuxtLink to="/events" class="group inline-flex items-center gap-1.5 text-sm font-bold text-brand-700">
              View all events
              <Icon name="lucide:arrow-right" class="transition-transform duration-200 group-hover:translate-x-0.5" />
            </NuxtLink>
          </div>

          <!-- Lead event: the edition visitors should open first -->
          <NuxtLink
            v-if="leadEvent"
            :to="`/events/${leadEvent.slug}`"
            class="group card card-hover mt-8 grid overflow-hidden lg:grid-cols-[1.15fr_1fr]"
          >
            <div class="img-zoom relative aspect-[16/10] lg:aspect-auto lg:min-h-[22rem]">
              <img
                :src="leadEvent.imageUrl"
                :alt="leadEvent.title"
                class="h-full w-full object-cover"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-ink/55 via-ink/10 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-transparent lg:to-white/10" />
              <span class="absolute left-4 top-4" :class="statusBadge(leadEvent.status).class">
                <span v-if="statusBadge(leadEvent.status).dot" class="dot-live" />
                {{ statusBadge(leadEvent.status).label }}
              </span>
            </div>

            <div class="flex flex-col justify-center gap-4 p-6 sm:p-8">
              <div class="flex flex-wrap items-center gap-2">
                <span class="badge badge-blue">{{ leadEvent.year }} edition</span>
                <span v-if="openCount(leadEvent)" class="pill-open">
                  <span class="dot-live" /> Registration open
                </span>
              </div>

              <div>
                <h3 class="text-2xl font-extrabold leading-tight tracking-tight transition-colors group-hover:text-brand-700 sm:text-3xl">
                  {{ leadEvent.title }}
                </h3>
                <p v-if="leadEvent.description" class="mt-2.5 line-clamp-2 text-sm leading-relaxed text-ink-soft">
                  {{ leadEvent.description }}
                </p>
              </div>

              <!-- competitions count gets its own line: it is the strongest pull -->
              <div class="flex items-baseline gap-2 border-t border-line pt-4">
                <Icon name="lucide:trophy" class="text-brand-600" />
                <span class="text-xl font-extrabold tracking-tight text-brand-700">{{ leadEvent.competitions.length }}</span>
                <span class="text-xs font-semibold text-ink-faint">
                  {{ leadEvent.competitions.length === 1 ? 'competition' : 'competitions' }}<template v-if="openCount(leadEvent)">, {{ openCount(leadEvent) }} open now</template>
                </span>
              </div>

              <dl class="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                <div>
                  <dt class="font-semibold text-ink-faint">Dates</dt>
                  <dd class="mt-0.5 font-bold text-ink">{{ formatDateRange(leadEvent.startDate, leadEvent.endDate) || 'To be announced' }}</dd>
                </div>
                <div>
                  <dt class="font-semibold text-ink-faint">Venue</dt>
                  <dd class="mt-0.5 truncate font-bold text-ink">{{ leadEvent.venue }}</dd>
                </div>
              </dl>

              <span class="inline-flex items-center gap-1.5 text-sm font-bold text-brand-700">
                View event
                <Icon name="lucide:arrow-right" class="transition-transform duration-200 group-hover:translate-x-1" />
              </span>
            </div>
          </NuxtLink>

          <!-- Remaining editions: compact rows, scannable side by side -->
          <div v-if="otherEvents.length" class="mt-4 grid gap-4 sm:grid-cols-2">
            <NuxtLink
              v-for="e in otherEvents"
              :key="e.id"
              :to="`/events/${e.slug}`"
              class="group card card-hover flex items-stretch gap-4 overflow-hidden p-3"
            >
              <div class="img-zoom relative h-24 w-24 shrink-0 overflow-hidden rounded-xl sm:h-28 sm:w-28">
                <img :src="e.imageUrl" :alt="e.title" class="h-full w-full object-cover" />
              </div>

              <div class="flex min-w-0 flex-1 flex-col justify-center gap-1.5 py-1 pr-1">
                <div class="flex flex-wrap items-center gap-1.5">
                  <span class="text-[0.7rem] font-bold uppercase tracking-wider text-ink-faint">{{ e.year }} edition</span>
                  <span v-if="openCount(e)" class="dot-live" />
                </div>
                <h3 class="truncate text-base font-extrabold leading-tight tracking-tight transition-colors group-hover:text-brand-700">
                  {{ e.title }}
                </h3>
                <p class="flex items-center gap-1.5 text-sm font-bold text-brand-700">
                  <Icon name="lucide:trophy" class="text-xs" />
                  {{ e.competitions.length }} {{ e.competitions.length === 1 ? 'competition' : 'competitions' }}
                </p>
                <p class="truncate text-xs text-ink-faint">
                  {{ formatDateRange(e.startDate, e.endDate) || e.venue }}
                </p>
              </div>

              <div class="flex items-center pr-2">
                <Icon
                  name="lucide:arrow-right"
                  class="text-ink-faint transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-brand-700"
                />
              </div>
            </NuxtLink>
          </div>
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

    <!-- 10. LATEST NEWS (featured + compact list) -->
    <SiteSectionReveal v-if="featuredArticle">
      <section class="section !pt-0">
        <div class="container-site">
          <div class="flex flex-wrap items-end justify-between gap-3">
            <h2 class="text-title">Latest news</h2>
            <NuxtLink to="/news" class="link-underline text-sm text-brand-600">All news</NuxtLink>
          </div>

          <div class="mt-8 grid gap-5 lg:grid-cols-5">
            <!-- featured article -->
            <NuxtLink
              :to="`/news/${featuredArticle.slug}`"
              class="card card-hover group flex flex-col overflow-hidden lg:col-span-3"
            >
              <div class="img-zoom relative aspect-[16/9] w-full overflow-hidden bg-mist-2">
                <img
                  v-if="featuredArticle.coverImage"
                  :src="featuredArticle.coverImage"
                  :alt="featuredArticle.title"
                  class="h-full w-full object-cover"
                />
                <div v-else class="flex h-full w-full items-center justify-center text-ink-faint">
                  <Icon name="lucide:newspaper" class="text-4xl" />
                </div>
                <span class="badge badge-blue absolute left-4 top-4 shadow-soft">Featured</span>
              </div>
              <div class="flex flex-1 flex-col p-6">
                <p class="flex items-center gap-1.5 text-xs font-semibold text-ink-faint">
                  <Icon name="lucide:calendar" /> {{ formatDate(featuredArticle.publishedAt) }}
                </p>
                <h3 class="mt-2 text-2xl font-extrabold leading-snug tracking-tight transition-colors group-hover:text-brand-600">
                  {{ featuredArticle.title }}
                </h3>
                <p class="mt-2 line-clamp-2 leading-relaxed text-ink-soft">{{ featuredArticle.excerpt }}</p>
                <span class="mt-4 flex items-center gap-1.5 text-sm font-bold text-brand-600">
                  Read more
                  <Icon name="lucide:arrow-right" class="transition-transform duration-150 group-hover:translate-x-1" />
                </span>
              </div>
            </NuxtLink>

            <!-- compact list -->
            <div class="flex flex-col gap-4 lg:col-span-2">
              <NuxtLink
                v-for="article in restArticles"
                :key="article.id"
                :to="`/news/${article.slug}`"
                class="card card-hover group flex flex-1 items-center gap-4 p-3.5"
              >
                <div class="img-zoom h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-mist-2">
                  <img
                    v-if="article.coverImage"
                    :src="article.coverImage"
                    :alt="article.title"
                    loading="lazy"
                    class="h-full w-full object-cover"
                  />
                  <div v-else class="flex h-full w-full items-center justify-center text-ink-faint">
                    <Icon name="lucide:newspaper" class="text-xl" />
                  </div>
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-[11px] font-semibold text-ink-faint">{{ formatDate(article.publishedAt) }}</p>
                  <h3 class="mt-0.5 line-clamp-2 text-sm font-extrabold leading-snug tracking-tight transition-colors group-hover:text-brand-600">
                    {{ article.title }}
                  </h3>
                  <p class="mt-0.5 line-clamp-1 text-xs text-ink-soft">{{ article.excerpt }}</p>
                </div>
                <Icon
                  name="lucide:arrow-right"
                  class="shrink-0 text-ink-faint transition-all duration-150 group-hover:translate-x-1 group-hover:text-brand-600"
                />
              </NuxtLink>
            </div>
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

    <!-- 12. FAQ -->
    <!-- Venue used to live here, paired with FAQ rather than with Contact --
         so on an event with no FAQs yet (the common early state) the map sat
         alone in a half-width grid column with an empty cell beside it, then
         the actual Contact card appeared in an entirely separate section
         further down the page. Venue moved into the Contact section below,
         where it visually belongs; FAQ stands on its own here. -->
    <SiteSectionReveal v-if="visible('faq') && data?.faqs?.length">
      <section class="section !pt-0">
        <div class="container-site">
          <h2 class="text-title">{{ s('faq_heading', 'Frequently asked questions') }}</h2>
          <SiteFaqAccordion class="mt-6 max-w-3xl" :faqs="data!.faqs" />
        </div>
      </section>
    </SiteSectionReveal>

    <!-- 14. VENUE + CONTACT -->
    <!-- One section, one container: the map (when there is one) stacks
         directly above the contact card with a single consistent gap,
         instead of each living in its own independently-padded section. -->
    <SiteSectionReveal>
      <section class="section !pt-0">
        <div class="container-site mx-auto max-w-5xl">
          <SiteVenueMap
            v-if="hasVenue"
            class="mb-8"
            :name="s('venue_name')"
            :address="s('venue_address')"
            :directions="s('venue_directions')"
            :map-embed="s('venue_map_embed')"
          />
          <UiContactCard
            title="Get in touch"
            description="Questions about the festival, sponsorship, or partnerships? Fill out the form and we will respond within one business day."
            :contact-info="contactInfo"
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
