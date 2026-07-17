<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const { data } = await useFetch('/api/admin/settings')

// Text settings grouped for the form.
const groups: { title: string; icon: string; fields: { key: string; label: string }[] }[] = [
  {
    title: 'Hero',
    icon: 'lucide:megaphone',
    fields: [
      { key: 'hero_eyebrow', label: 'Hero eyebrow (small label)' },
      { key: 'hero_tagline', label: 'Hero tagline' },
      { key: 'hero_blurb', label: 'Hero blurb (description)' },
    ],
  },
  {
    title: 'Hero stats',
    icon: 'lucide:bar-chart-3',
    fields: [
      { key: 'stat_participants', label: 'Participants' },
      { key: 'stat_teams', label: 'Teams' },
      { key: 'stat_universities', label: 'Universities' },
    ],
  },
  {
    title: 'General',
    icon: 'lucide:settings-2',
    fields: [
      { key: 'contact_email', label: 'Contact email' },
      { key: 'facebook_url', label: 'Facebook URL' },
      { key: 'linkedin_url', label: 'LinkedIn URL' },
      { key: 'footer_text', label: 'Footer text' },
    ],
  },
  {
    title: 'Section headings',
    icon: 'lucide:heading',
    fields: [
      { key: 'why_heading', label: 'Why Join heading' },
      { key: 'why_subtext', label: 'Why Join subtext' },
      { key: 'timeline_heading', label: 'Timeline heading' },
      { key: 'sponsors_heading', label: 'Sponsors heading' },
      { key: 'people_heading', label: 'Judges & Speakers heading' },
      { key: 'gallery_heading', label: 'Gallery heading' },
      { key: 'winners_heading', label: 'Winners heading' },
      { key: 'faq_heading', label: 'FAQ heading' },
      { key: 'newsletter_heading', label: 'Newsletter heading' },
      { key: 'newsletter_subtext', label: 'Newsletter subtext' },
    ],
  },
  {
    title: 'Legal pages',
    icon: 'lucide:scale',
    fields: [
      { key: 'privacy_policy', label: 'Privacy policy text' },
      { key: 'terms_conditions', label: 'Terms & conditions text' },
    ],
  },
  {
    title: 'Venue & location',
    icon: 'lucide:map-pin',
    fields: [
      { key: 'venue_heading', label: 'Venue heading' },
      { key: 'venue_name', label: 'Venue name' },
      { key: 'venue_address', label: 'Venue address' },
      { key: 'venue_directions', label: 'Directions' },
      { key: 'venue_map_embed', label: 'Google Maps embed URL' },
    ],
  },
]

// Section visibility toggles.
const toggles = [
  { key: 'section_why_visible', label: 'Why Join' },
  { key: 'section_timeline_visible', label: 'Timeline' },
  { key: 'section_sponsors_visible', label: 'Sponsors' },
  { key: 'section_people_visible', label: 'Judges & Speakers' },
  { key: 'section_gallery_visible', label: 'Media Gallery' },
  { key: 'section_winners_visible', label: 'Winners' },
  { key: 'section_faq_visible', label: 'FAQ' },
  { key: 'section_venue_visible', label: 'Venue' },
  { key: 'section_newsletter_visible', label: 'Newsletter' },
]

const allTextKeys = groups.flatMap((g) => g.fields.map((f) => f.key))
const src = (data.value as Record<string, string>) ?? {}

const form = reactive<Record<string, string>>(Object.fromEntries(allTextKeys.map((k) => [k, src[k] ?? ''])))
// Toggle defaults to ON unless explicitly '0'.
const vis = reactive<Record<string, boolean>>(Object.fromEntries(toggles.map((t) => [t.key, src[t.key] !== '0'])))

const saving = ref(false)
const savedAt = ref('')

async function save() {
  saving.value = true
  try {
    const payload: Record<string, string> = { ...form }
    for (const t of toggles) payload[t.key] = vis[t.key] ? '1' : '0'
    await $fetch('/api/admin/settings', { method: 'PUT', body: payload })
    savedAt.value = new Date().toLocaleTimeString()
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <div class="admin-head">
      <div>
        <h1 class="admin-h1">Site settings</h1>
        <p class="admin-sub">Text, headings, legal copy and which home-page sections show.</p>
      </div>
      <Transition enter-active-class="transition duration-200" enter-from-class="opacity-0">
        <span v-if="savedAt" class="inline-flex items-center gap-1 text-sm text-green-700"><Icon name="lucide:check-circle" /> Saved {{ savedAt }}</span>
      </Transition>
    </div>

    <form class="mt-6 max-w-2xl space-y-5" @submit.prevent="save">
      <div v-for="g in groups" :key="g.title" class="admin-panel">
        <div class="mb-4 flex items-center gap-2.5">
          <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100 text-brand-700"><Icon :name="g.icon" /></span>
          <h2 class="text-sm font-bold text-ink">{{ g.title }}</h2>
        </div>
        <div class="space-y-4">
          <div v-for="f in g.fields" :key="f.key">
            <label class="label">{{ f.label }}</label>
            <input v-model="form[f.key]" class="input" maxlength="2000" />
          </div>
        </div>
      </div>

      <div class="admin-panel">
        <div class="mb-4 flex items-center gap-2.5">
          <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100 text-brand-700"><Icon name="lucide:eye" /></span>
          <h2 class="text-sm font-bold text-ink">Show / hide sections</h2>
        </div>
        <div class="grid gap-2.5 sm:grid-cols-2">
          <label v-for="t in toggles" :key="t.key" class="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-line bg-mist-1 px-3.5 py-2.5">
            <span class="text-sm font-medium text-ink">{{ t.label }}</span>
            <span class="relative inline-flex shrink-0">
              <input v-model="vis[t.key]" type="checkbox" class="peer sr-only" />
              <span class="block h-5 w-9 rounded-full bg-line transition-colors peer-checked:bg-brand-600" />
              <span class="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
            </span>
          </label>
        </div>
        <p class="mt-3 text-xs text-ink-faint">Sections also hide automatically when they have no content.</p>
      </div>

      <div class="sticky bottom-4 flex items-center gap-3 rounded-2xl border border-line bg-white/90 p-3 shadow-lift backdrop-blur">
        <button type="submit" class="btn-primary" :disabled="saving">
          <Icon v-if="saving" name="lucide:loader-2" class="animate-spin" />
          {{ saving ? 'Saving…' : 'Save settings' }}
        </button>
        <span class="text-xs text-ink-faint">Changes go live on the public site immediately.</span>
      </div>
    </form>
  </div>
</template>
