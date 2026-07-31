<script setup lang="ts">
export interface EventFormData {
  title: string
  year: number
  slug: string
  description: string
  startDate: string | null
  endDate: string | null
  venue: string | null
  heroImage: string | null
  status: 'upcoming' | 'ongoing' | 'past'
  featured: boolean
  theme: string
  organizer: string
  contactEmail: string
  contactPhone: string
  emergencyContact: string
  entryFee: string
  certificate: boolean
  language: string
  eligibility: string
  objectives: string
  audience: string
  benefits: string
  venueAddress: string
  venueDirections: string
  venueParking: string
  mapEmbed: string
  tagline: string
  eventType: 'offline' | 'online' | 'hybrid'
  published: boolean
  countdownMode: 'start' | 'deadline' | 'custom' | 'off'
  countdownAt: string | null
  meetingInfo: string
  sections: string
  seoDescription: string
}

/** Page sections the admin can switch off per event. */
const SECTION_KEYS = [
  { key: 'quick', label: 'Quick information' },
  { key: 'about', label: 'About the event' },
  { key: 'prizes', label: 'Prize pool' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'competitions', label: 'Competition segments' },
  { key: 'schedule', label: 'Programme schedule' },
  { key: 'criteria', label: 'Judging criteria' },
  { key: 'people', label: 'Judges' },
  { key: 'sponsors', label: 'Sponsors' },
  { key: 'venue', label: 'Venue' },
  { key: 'gallery', label: 'Gallery' },
  { key: 'faq', label: 'FAQ' },
  { key: 'cta', label: 'Registration call to action' },
] as const

const props = defineProps<{ initial?: Partial<EventFormData>; saving?: boolean }>()
const emit = defineEmits<{ submit: [data: EventFormData]; draft: [data: Record<string, any>] }>()

const form = reactive<EventFormData>({
  title: props.initial?.title ?? '',
  year: props.initial?.year ?? new Date().getFullYear(),
  slug: props.initial?.slug ?? '',
  description: props.initial?.description ?? '',
  startDate: props.initial?.startDate ?? null,
  endDate: props.initial?.endDate ?? null,
  venue: props.initial?.venue ?? null,
  heroImage: props.initial?.heroImage ?? null,
  status: props.initial?.status ?? 'upcoming',
  featured: props.initial?.featured ?? false,
  theme: props.initial?.theme ?? '',
  organizer: props.initial?.organizer ?? 'BICTA',
  contactEmail: props.initial?.contactEmail ?? '',
  contactPhone: props.initial?.contactPhone ?? '',
  emergencyContact: props.initial?.emergencyContact ?? '',
  entryFee: props.initial?.entryFee ?? '',
  certificate: props.initial?.certificate ?? true,
  language: props.initial?.language ?? '',
  eligibility: props.initial?.eligibility ?? '',
  objectives: props.initial?.objectives ?? '',
  audience: props.initial?.audience ?? '',
  benefits: props.initial?.benefits ?? '',
  venueAddress: props.initial?.venueAddress ?? '',
  venueDirections: props.initial?.venueDirections ?? '',
  venueParking: props.initial?.venueParking ?? '',
  mapEmbed: props.initial?.mapEmbed ?? '',
  tagline: props.initial?.tagline ?? '',
  eventType: props.initial?.eventType ?? 'offline',
  published: props.initial?.published ?? true,
  countdownMode: props.initial?.countdownMode ?? 'start',
  countdownAt: props.initial?.countdownAt ?? null,
  meetingInfo: props.initial?.meetingInfo ?? '',
  sections: props.initial?.sections ?? '',
  seoDescription: props.initial?.seoDescription ?? '',
})

// ---- Tabs: the form is long, so it is split rather than scrolled ----
const tabs = [
  { id: 'basics', label: 'Basics', icon: 'lucide:calendar-days' },
  { id: 'about', label: 'About', icon: 'lucide:text' },
  { id: 'venue', label: 'Venue & contact', icon: 'lucide:map-pin' },
  { id: 'page', label: 'Page sections', icon: 'lucide:layout-list' },
  { id: 'seo', label: 'SEO & publish', icon: 'lucide:globe' },
]
const tab = ref('basics')

// ---- Section visibility, stored as JSON in `sections` ----
const sectionState = reactive<Record<string, boolean>>({})
try {
  const parsed = form.sections ? JSON.parse(form.sections) : {}
  for (const s of SECTION_KEYS) sectionState[s.key] = parsed?.[s.key]?.visible !== false
} catch {
  for (const s of SECTION_KEYS) sectionState[s.key] = true
}
const hiddenCount = computed(() => SECTION_KEYS.filter((s) => !sectionState[s.key]).length)

// Google's "Embed a map" dialog shows the whole <iframe src="…"> tag to copy;
// pasting all of it (rather than just the URL) is the natural thing to do and
// silently breaks the map on the public page. Clean it up as soon as the field
// is left, so what gets saved is always just the URL.
function normalizeMapEmbed() {
  const fromTag = form.mapEmbed.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1]
  if (fromTag) form.mapEmbed = fromTag.trim()
}

// Slug preview mirrors the server's slugify so the admin sees the real URL.
const slugPreview = computed(() => {
  const raw = form.slug || form.title
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'your-event'
})

// Only the switches that are off are persisted; an absent key means visible.
function sectionSnapshot() {
  const out: Record<string, { visible: boolean }> = {}
  for (const s of SECTION_KEYS) if (!sectionState[s.key]) out[s.key] = { visible: false }
  return Object.keys(out).length ? JSON.stringify(out) : ''
}

function submit() {
  emit('submit', { ...form, sections: sectionSnapshot() })
}

// Work in progress is reported upward (debounced) so a screen that has nowhere
// to save it yet — the create form — can keep it in the browser.
let draftTimer: ReturnType<typeof setTimeout> | undefined
watch(
  () => ({ ...form, sections: sectionSnapshot() }),
  (snapshot) => {
    clearTimeout(draftTimer)
    draftTimer = setTimeout(() => emit('draft', snapshot), 500)
  },
  { deep: true },
)
onBeforeUnmount(() => clearTimeout(draftTimer))

// Surfaced inline so a bad range is caught before the server rejects it.
const dateWarning = computed(() =>
  form.startDate && form.endDate && form.endDate < form.startDate ? 'End date is before the start date.' : '',
)
</script>

<template>
  <form class="space-y-6" @submit.prevent="submit">
    <!-- tab bar -->
    <div class="flex items-center gap-1 overflow-x-auto border-b border-line pb-px" role="tablist">
      <button
        v-for="t in tabs"
        :key="t.id"
        type="button"
        role="tab"
        :aria-selected="tab === t.id"
        class="relative shrink-0 px-4 py-3 text-sm font-semibold transition-colors"
        :class="tab === t.id ? 'text-brand-700' : 'text-ink-faint hover:text-ink-soft'"
        @click="tab = t.id"
      >
        <Icon :name="t.icon" /> {{ t.label }}
        <span v-if="tab === t.id" class="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand-600" />
      </button>
    </div>

    <div v-show="tab === 'basics'" class="space-y-6">
    <AdminFormSection title="Basics" description="How this edition is named and listed." icon="lucide:calendar-days">
      <div>
        <label class="label" for="ev-title">Title <span class="text-red-600">*</span></label>
        <input id="ev-title" v-model="form.title" class="input" required maxlength="200" placeholder="BICTA 2026" />
      </div>
      <div>
        <label class="label" for="ev-tagline">Tagline</label>
        <input id="ev-tagline" v-model="form.tagline" class="input" maxlength="300" placeholder="Innovate. Code. Compete." />
        <p class="mt-1 text-xs text-ink-faint">The one-liner under the title in the hero.</p>
      </div>
      <div>
        <label class="label" for="ev-theme">Theme</label>
        <input id="ev-theme" v-model="form.theme" class="input" maxlength="200" placeholder="Building for a resilient future" />
        <p class="mt-1 text-xs text-ink-faint">Shown under the title on the event page.</p>
      </div>
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label class="label" for="ev-year">Year <span class="text-red-600">*</span></label>
          <input id="ev-year" v-model.number="form.year" type="number" class="input" required min="2000" max="2100" />
        </div>
        <div>
          <label class="label" for="ev-status">Status</label>
          <select id="ev-status" v-model="form.status" class="input">
            <option value="upcoming">Upcoming</option>
            <option value="ongoing">Ongoing</option>
            <option value="past">Past</option>
          </select>
        </div>
      </div>
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label class="label" for="ev-type">Format</label>
          <select id="ev-type" v-model="form.eventType" class="input">
            <option value="offline">In person</option>
            <option value="online">Online</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </div>
      </div>
      <div>
        <label class="label" for="ev-organizer">Organised by</label>
        <input id="ev-organizer" v-model="form.organizer" class="input" maxlength="200" placeholder="BICTA" />
      </div>
      <div>
        <label class="label" for="ev-slug">Slug <span class="font-normal text-ink-faint">(optional — generated from the title)</span></label>
        <input id="ev-slug" v-model="form.slug" class="input font-mono" maxlength="100" placeholder="bicta-2026" />
        <p class="mt-1 text-xs text-ink-faint">Public URL: <span class="font-mono text-brand-700">/events/{{ slugPreview }}</span></p>
      </div>
      <label class="flex items-start gap-3">
        <input v-model="form.featured" type="checkbox" class="mt-0.5 h-4 w-4 accent-brand-600" />
        <span>
          <span class="font-semibold text-ink">Feature on the home page</span>
          <span class="block text-xs text-ink-faint">Featured editions appear in the Featured Events rail.</span>
        </span>
      </label>
    </AdminFormSection>

    <AdminFormSection title="Schedule" description="Dates power the public countdown and the event status." icon="lucide:calendar-clock">
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label class="label" for="ev-start">Start date</label>
          <input id="ev-start" v-model="form.startDate" type="date" class="input" />
        </div>
        <div>
          <label class="label" for="ev-end">End date</label>
          <input id="ev-end" v-model="form.endDate" type="date" class="input" :aria-invalid="Boolean(dateWarning)" />
        </div>
      </div>
      <p v-if="dateWarning" class="form-error" role="alert">{{ dateWarning }}</p>
    </AdminFormSection>

    <AdminFormSection title="Quick information" description="The fact cards near the top of the event page. Blank fields are hidden." icon="lucide:info">
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label class="label" for="ev-fee">Entry fee</label>
          <input id="ev-fee" v-model="form.entryFee" class="input" maxlength="100" placeholder="Free / BDT 500 per team" />
        </div>
        <div>
          <label class="label" for="ev-lang">Language</label>
          <input id="ev-lang" v-model="form.language" class="input" maxlength="100" placeholder="Bangla and English" />
        </div>
      </div>
      <div>
        <label class="label" for="ev-elig">Eligibility</label>
        <textarea id="ev-elig" v-model="form.eligibility" class="input" rows="2" maxlength="5000" placeholder="Open to all undergraduate students in Bangladesh." />
      </div>
      <div>
        <label class="label" for="ev-audience">Who should attend</label>
        <textarea id="ev-audience" v-model="form.audience" class="input" rows="2" maxlength="5000" placeholder="Students, early-career developers, designers." />
      </div>
      <label class="flex items-start gap-3">
        <input v-model="form.certificate" type="checkbox" class="mt-0.5 h-4 w-4 accent-brand-600" />
        <span>
          <span class="font-semibold text-ink">Certificate provided</span>
          <span class="block text-xs text-ink-faint">Shown as a fact card to reassure participants.</span>
        </span>
      </label>
    </AdminFormSection>

    </div>

    <div v-show="tab === 'about'" class="space-y-6">
    <AdminFormSection title="About this edition" description="Long-form content on the event page. One item per line for lists." icon="lucide:text">
      <div>
        <label class="label">Description</label>
        <AdminRichText v-model="form.description" />
      </div>
      <div>
        <label class="label" for="ev-obj">Objectives</label>
        <textarea id="ev-obj" v-model="form.objectives" class="input" rows="4" maxlength="10000" placeholder="One objective per line." />
      </div>
      <div>
        <label class="label" for="ev-benefits">What participants get</label>
        <textarea id="ev-benefits" v-model="form.benefits" class="input" rows="4" maxlength="10000" placeholder="One benefit per line." />
      </div>
    </AdminFormSection>

    </div>

    <div v-show="tab === 'venue'" class="space-y-6">
    <AdminFormSection title="Venue" description="Where this edition happens, plus the embedded map." icon="lucide:map-pin">
      <div>
        <label class="label" for="ev-venue">Venue name</label>
        <input id="ev-venue" v-model="form.venue" class="input" maxlength="200" placeholder="Main auditorium, City Campus" />
      </div>
      <div>
        <label class="label" for="ev-addr">Full address</label>
        <textarea id="ev-addr" v-model="form.venueAddress" class="input" rows="2" maxlength="1000" />
      </div>
      <div>
        <label class="label" for="ev-dir">How to get there</label>
        <textarea id="ev-dir" v-model="form.venueDirections" class="input" rows="3" maxlength="5000" />
      </div>
      <div>
        <label class="label" for="ev-park">Parking</label>
        <textarea id="ev-park" v-model="form.venueParking" class="input" rows="2" maxlength="2000" />
      </div>
      <div v-if="form.eventType !== 'offline'">
        <label class="label" for="ev-meeting">Joining details (online / hybrid)</label>
        <textarea id="ev-meeting" v-model="form.meetingInfo" class="input" rows="3" maxlength="2000" placeholder="Zoom link, meeting ID, dial-in number." />
      </div>
      <div>
        <label class="label" for="ev-map">Google Maps embed URL</label>
        <input id="ev-map" v-model="form.mapEmbed" class="input font-mono text-xs" maxlength="2000" placeholder="https://www.google.com/maps/embed?pb=…" @blur="normalizeMapEmbed" />
        <p class="mt-1 text-xs text-ink-faint">
          Use the <strong>src</strong> from Google Maps &gt; Share &gt; <strong>Embed a map</strong>. A short share link
          (maps.app.goo.gl/…) cannot be embedded — Google blocks it — but it still works as the "Open in Google Maps"
          button. Leave this blank and the map is built from the address above.
        </p>
      </div>
    </AdminFormSection>

    <AdminFormSection title="Contact" description="Who participants reach on the day." icon="lucide:phone">
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label class="label" for="ev-cemail">Contact email</label>
          <input id="ev-cemail" v-model="form.contactEmail" type="email" class="input" maxlength="200" placeholder="events@bicta.org" />
        </div>
        <div>
          <label class="label" for="ev-cphone">Contact phone</label>
          <input id="ev-cphone" v-model="form.contactPhone" class="input" maxlength="100" />
        </div>
      </div>
      <div>
        <label class="label" for="ev-emerg">Emergency contact</label>
        <input id="ev-emerg" v-model="form.emergencyContact" class="input" maxlength="200" placeholder="Name and number for urgent issues" />
      </div>
    </AdminFormSection>

    </div>

    <div v-show="tab === 'page'" class="space-y-6">
      <AdminFormSection title="Hero image" description="Wide banner at the top of the event page." icon="lucide:image">
        <AdminImageUploader v-model="form.heroImage" />
      </AdminFormSection>

      <AdminFormSection title="Countdown" description="The timer in the event hero." icon="lucide:timer">
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="label" for="ev-cdmode">Counts down to</label>
            <select id="ev-cdmode" v-model="form.countdownMode" class="input">
              <option value="start">Event start date</option>
              <option value="deadline">Registration deadline</option>
              <option value="custom">A specific date and time</option>
              <option value="off">Hide the countdown</option>
            </select>
          </div>
          <div v-if="form.countdownMode === 'custom'">
            <label class="label" for="ev-cdat">Target date and time</label>
            <input id="ev-cdat" v-model="form.countdownAt" type="datetime-local" class="input" />
          </div>
        </div>
        <p class="flex items-start gap-2 rounded-xl bg-mist-1 p-3 text-xs leading-relaxed text-ink-soft">
          <Icon name="lucide:info" class="mt-0.5 shrink-0 text-brand-700" />
          Once the target passes the hero switches itself to "Event is Live", then to "Event Completed" after the end date.
        </p>
      </AdminFormSection>

      <AdminFormSection title="Sections shown on the page" description="Turn a section off to hide it for this event. Sections with no content hide themselves anyway." icon="lucide:layout-list">
        <p v-if="hiddenCount" class="text-xs font-semibold text-ink-soft">{{ hiddenCount }} section{{ hiddenCount === 1 ? '' : 's' }} hidden.</p>
        <div class="grid gap-2 sm:grid-cols-2">
          <label v-for="sec in SECTION_KEYS" :key="sec.key" class="flex items-center gap-2.5 rounded-xl border border-line p-3">
            <input v-model="sectionState[sec.key]" type="checkbox" class="h-4 w-4 accent-brand-600" />
            <span class="text-sm font-semibold text-ink">{{ sec.label }}</span>
          </label>
        </div>
      </AdminFormSection>
    </div>

    <div v-show="tab === 'seo'" class="space-y-6">
      <AdminFormSection title="Search & sharing" description="Used for the page title, search results and link previews." icon="lucide:globe">
        <div>
          <label class="label" for="ev-seodesc">Meta description</label>
          <textarea id="ev-seodesc" v-model="form.seoDescription" class="input" rows="2" maxlength="300" placeholder="One or two sentences describing this edition." />
          <p class="mt-1 text-xs text-ink-faint">Falls back to the tagline when blank. {{ form.seoDescription.length }}/300.</p>
        </div>
        <div>
          <p class="label">Page URL</p>
          <p class="rounded-xl bg-mist-1 p-3 font-mono text-sm text-ink-soft">/events/{{ slugPreview }}</p>
        </div>
      </AdminFormSection>

      <AdminFormSection title="Publish state" description="Controlled by the Preview and Publish buttons at the top of this page." icon="lucide:send">
        <p class="flex items-start gap-2 rounded-xl bg-mist-1 p-3 text-xs leading-relaxed text-ink-soft">
          <Icon name="lucide:info" class="mt-0.5 shrink-0 text-brand-700" />
          <span v-if="form.published">
            This event is <strong>published</strong> and visible to everyone. Saving here keeps it published.
          </span>
          <span v-else>
            This event is a <strong>draft</strong>: it 404s on the public site and stays out of every listing.
            Preview it, then use Publish when it is ready.
          </span>
        </p>
      </AdminFormSection>
    </div>

    <AdminFormActions
      :saving="saving"
      label="Save event"
      :hint="form.published ? 'This event is published, so changes go live immediately.' : 'Saved as a draft. Nothing is public until you publish.'"
    />
  </form>
</template>
