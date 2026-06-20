<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const { data } = await useFetch('/api/admin/settings')

// Text settings grouped for the form.
const groups: { title: string; fields: { key: string; label: string }[] }[] = [
  {
    title: 'Hero',
    fields: [
      { key: 'hero_eyebrow', label: 'Hero eyebrow (small label)' },
      { key: 'hero_tagline', label: 'Hero tagline' },
      { key: 'hero_blurb', label: 'Hero blurb (description)' },
    ],
  },
  {
    title: 'Hero stats',
    fields: [
      { key: 'stat_participants', label: 'Participants' },
      { key: 'stat_teams', label: 'Teams' },
      { key: 'stat_universities', label: 'Universities' },
    ],
  },
  {
    title: 'General',
    fields: [
      { key: 'contact_email', label: 'Contact email' },
      { key: 'facebook_url', label: 'Facebook URL' },
      { key: 'linkedin_url', label: 'LinkedIn URL' },
      { key: 'footer_text', label: 'Footer text' },
    ],
  },
  {
    title: 'Section headings',
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
    title: 'Venue & location',
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
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold tracking-tight">Site settings</h1>
      <span v-if="savedAt" class="text-sm text-ink-faint">Saved {{ savedAt }}</span>
    </div>

    <form class="mt-6 max-w-xl space-y-6" @submit.prevent="save">
      <fieldset v-for="g in groups" :key="g.title" class="space-y-4 rounded-xl border border-line bg-white p-6">
        <legend class="px-1 text-sm font-bold">{{ g.title }}</legend>
        <div v-for="f in g.fields" :key="f.key">
          <label class="label">{{ f.label }}</label>
          <input v-model="form[f.key]" class="input" maxlength="2000" />
        </div>
      </fieldset>

      <fieldset class="rounded-xl border border-line bg-white p-6">
        <legend class="px-1 text-sm font-bold">Show / hide sections</legend>
        <div class="grid grid-cols-2 gap-3">
          <label v-for="t in toggles" :key="t.key" class="flex items-center gap-2 text-sm font-medium">
            <input v-model="vis[t.key]" type="checkbox" class="h-4 w-4 accent-accent" />
            {{ t.label }}
          </label>
        </div>
        <p class="mt-3 text-xs text-ink-faint">Sections also hide automatically when they have no content.</p>
      </fieldset>

      <button type="submit" class="btn-primary" :disabled="saving">
        {{ saving ? 'Saving…' : 'Save settings' }}
      </button>
    </form>
  </div>
</template>
