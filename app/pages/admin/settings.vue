<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const { data } = await useFetch('/api/admin/settings')

interface SettingField {
  key: string
  label: string
  type?: 'text' | 'textarea'
  hint?: string
}

// Text settings grouped for the form.
const groups: { id: string; title: string; icon: string; description: string; fields: SettingField[] }[] = [
  {
    id: 'hero',
    title: 'Hero',
    icon: 'lucide:megaphone',
    description: 'The first thing visitors read on the home page.',
    fields: [
      { key: 'hero_eyebrow', label: 'Hero eyebrow (small label)' },
      { key: 'hero_tagline', label: 'Hero tagline' },
      { key: 'hero_blurb', label: 'Hero blurb (description)', type: 'textarea' },
    ],
  },
  {
    id: 'stats',
    title: 'Hero stats',
    icon: 'lucide:bar-chart-3',
    description: 'Three numbers shown under the hero.',
    fields: [
      { key: 'stat_participants', label: 'Participants' },
      { key: 'stat_teams', label: 'Teams' },
      { key: 'stat_universities', label: 'Universities' },
    ],
  },
  {
    id: 'general',
    title: 'General',
    icon: 'lucide:settings-2',
    description: 'Contact details and footer.',
    fields: [
      { key: 'contact_email', label: 'Contact email' },
      { key: 'facebook_url', label: 'Facebook URL' },
      { key: 'linkedin_url', label: 'LinkedIn URL' },
      { key: 'footer_text', label: 'Footer text', type: 'textarea' },
    ],
  },
  {
    id: 'headings',
    title: 'Section headings',
    icon: 'lucide:heading',
    description: 'Titles above each home-page section.',
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
    id: 'legal',
    title: 'Legal pages',
    icon: 'lucide:scale',
    description: 'Content of /privacy and /terms.',
    fields: [
      { key: 'privacy_policy', label: 'Privacy policy text', type: 'textarea' },
      { key: 'terms_conditions', label: 'Terms & conditions text', type: 'textarea' },
    ],
  },
  {
    id: 'venue',
    title: 'Venue & location',
    icon: 'lucide:map-pin',
    description: 'Where the event happens, plus the embedded map.',
    fields: [
      { key: 'venue_heading', label: 'Venue heading' },
      { key: 'venue_name', label: 'Venue name' },
      { key: 'venue_address', label: 'Venue address', type: 'textarea' },
      { key: 'venue_directions', label: 'Directions', type: 'textarea' },
      { key: 'venue_map_embed', label: 'Google Maps embed URL', hint: 'The src of the iframe Google gives you.' },
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

// Snapshot for the unsaved-changes indicator.
const clean = ref(JSON.stringify({ ...form, ...vis }))
const dirty = computed(() => JSON.stringify({ ...form, ...vis }) !== clean.value)

const saving = ref(false)
const savedAt = ref('')
const toast = useToast()

async function save() {
  saving.value = true
  try {
    const payload: Record<string, string> = { ...form }
    for (const t of toggles) payload[t.key] = vis[t.key] ? '1' : '0'
    await $fetch('/api/admin/settings', { method: 'PUT', body: payload })
    savedAt.value = new Date().toLocaleTimeString()
    clean.value = JSON.stringify({ ...form, ...vis })
    toast.success('Settings saved', 'The public site is updated already.')
  } catch (e: any) {
    toast.error('Could not save settings', e?.data?.statusMessage ?? 'Try again in a moment.')
  } finally {
    saving.value = false
  }
}

const hiddenCount = computed(() => toggles.filter((t) => !vis[t.key]).length)
</script>

<template>
  <div class="space-y-6">
    <AdminPageHeader title="Site settings" subtitle="Text, headings, legal copy and which home-page sections show." icon="lucide:settings">
      <template #badge>
        <span v-if="dirty" class="status status-warn">Unsaved changes</span>
      </template>
      <template #actions>
        <Transition enter-active-class="transition duration-200" enter-from-class="opacity-0">
          <span v-if="savedAt && !dirty" class="inline-flex items-center gap-1.5 text-sm font-semibold text-green-700">
            <Icon name="lucide:circle-check-big" /> Saved {{ savedAt }}
          </span>
        </Transition>
      </template>
    </AdminPageHeader>

    <div class="grid gap-6 xl:grid-cols-[13rem_1fr] xl:items-start">
      <!-- section jump list -->
      <nav class="hidden xl:sticky xl:top-24 xl:block" aria-label="Settings sections">
        <ul class="space-y-0.5">
          <li v-for="g in groups" :key="g.id">
            <a
              :href="`#set-${g.id}`"
              class="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-mist-1 hover:text-ink"
            >
              <Icon :name="g.icon" class="text-ink-faint" /> {{ g.title }}
            </a>
          </li>
          <li>
            <a href="#set-visibility" class="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-mist-1 hover:text-ink">
              <Icon name="lucide:eye" class="text-ink-faint" /> Show / hide
            </a>
          </li>
        </ul>
      </nav>

      <form class="min-w-0 space-y-5" @submit.prevent="save">
        <AdminPanel
          v-for="(g, gi) in groups"
          :id="`set-${g.id}`"
          :key="g.id"
          :title="g.title"
          :subtitle="g.description"
          :icon="g.icon"
          class="fade-up scroll-mt-24"
          :class="`stagger-${Math.min(gi + 1, 4)}`"
        >
          <div class="grid max-w-3xl gap-4" :class="g.fields.length > 4 ? 'sm:grid-cols-2' : ''">
            <div v-for="f in g.fields" :key="f.key" :class="f.type === 'textarea' ? 'sm:col-span-2' : ''">
              <label class="label" :for="`s-${f.key}`">{{ f.label }}</label>
              <textarea v-if="f.type === 'textarea'" :id="`s-${f.key}`" v-model="form[f.key]" class="input" rows="4" maxlength="2000" />
              <input v-else :id="`s-${f.key}`" v-model="form[f.key]" class="input" maxlength="2000" />
              <p v-if="f.hint" class="mt-1.5 text-xs text-ink-faint">{{ f.hint }}</p>
            </div>
          </div>
        </AdminPanel>

        <AdminPanel
          id="set-visibility"
          title="Show / hide sections"
          subtitle="Sections also hide automatically when they have no content."
          icon="lucide:eye"
          class="fade-up scroll-mt-24"
        >
          <template #actions>
            <span v-if="hiddenCount" class="status status-neutral">{{ hiddenCount }} hidden</span>
          </template>
          <div class="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            <AdminSwitch v-for="t in toggles" :key="t.key" v-model="vis[t.key]" :label="t.label" />
          </div>
        </AdminPanel>

        <AdminFormActions
          :saving="saving"
          label="Save settings"
          :hint="dirty ? 'You have unsaved changes.' : 'Changes go live on the public site immediately.'"
        />
      </form>
    </div>
  </div>
</template>
