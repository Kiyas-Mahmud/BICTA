<script setup lang="ts">
import type { Field } from '~/components/admin/Collection.vue'
definePageMeta({ layout: 'admin', middleware: 'admin' })

// Everything about one edition lives here: its details, its competitions, and
// the four content types that only exist inside an event. They used to sit in
// the global sidebar, which meant creating an event took visits to five
// unrelated screens.
const route = useRoute()
const id = Number(route.params.id)
const { data: ev, refresh } = await useFetch(`/api/admin/events/${id}`)

const saving = ref(false)
const savedAt = ref('')
const toast = useToast()
const { confirm } = useConfirm()

const tabs = [
  { id: 'details', label: 'Details', icon: 'lucide:file-text' },
  { id: 'competitions', label: 'Competitions', icon: 'lucide:trophy' },
  { id: 'prizes', label: 'Prize pool', icon: 'lucide:award' },
  { id: 'schedule', label: 'Schedule', icon: 'lucide:clock' },
  { id: 'criteria', label: 'Judging', icon: 'lucide:list-checks' },
  { id: 'announcements', label: 'Announcements', icon: 'lucide:megaphone' },
]
// Kept in the URL so a refresh, or a link shared with a colleague, lands on the
// same tab.
const tab = computed({
  get: () => (tabs.some((t) => t.id === route.query.tab) ? String(route.query.tab) : 'details'),
  set: (v: string) => navigateTo({ query: { ...route.query, tab: v } }, { replace: true }),
})

const scope = computed(() => ({ eventId: id }))

async function save(data: any) {
  saving.value = true
  try {
    await $fetch(`/api/admin/events/${id}`, { method: 'PUT', body: data })
    savedAt.value = new Date().toLocaleTimeString()
    await Promise.all([refresh(), refreshAdminStats()])
    toast.success('Event saved')
  } catch (e: any) {
    toast.error('Could not save the event', e?.data?.statusMessage ?? 'Check the fields and try again.')
  } finally {
    saving.value = false
  }
}

async function setPublished(next: boolean) {
  if (!ev.value) return
  if (next) {
    const ok = await confirm({
      title: `Publish ${ev.value.title}?`,
      body: 'The event page becomes visible to everyone and the edition appears in public listings.',
      confirmLabel: 'Publish event',
    })
    if (!ok) return
  }
  saving.value = true
  try {
    await $fetch(`/api/admin/events/${id}`, { method: 'PUT', body: { ...ev.value, published: next } })
    await Promise.all([refresh(), refreshAdminStats()])
    toast.success(next ? 'Event published' : 'Event moved back to draft')
  } catch (e: any) {
    toast.error('Could not change the publish state', e?.data?.statusMessage ?? 'Try again in a moment.')
  } finally {
    saving.value = false
  }
}

async function removeCompetition(compId: number, name: string) {
  const ok = await confirm({
    title: `Delete competition "${name}"?`,
    body: 'Its prizes and registrations are removed too. This cannot be undone.',
    confirmLabel: 'Delete competition',
  })
  if (!ok) return
  await $fetch(`/api/admin/competitions/${compId}`, { method: 'DELETE' })
  await Promise.all([refresh(), refreshAdminStats()])
  toast.success(`${name} deleted`)
}

// Preview opens the real public page; drafts are visible to signed-in admins.
const previewUrl = computed(() => (ev.value ? `/events/${ev.value.slug}?preview=1` : '#'))

const competitionOptions = computed(() =>
  (ev.value?.competitions ?? []).map((c: any) => ({ value: c.id, label: c.name })),
)

const prizeFields: Field[] = [
  { key: 'title', label: 'Prize title', colSpan: 2, placeholder: 'Champion' },
  { key: 'amount', label: 'Amount', placeholder: 'BDT 100,000 — or "Internship offer"' },
  { key: 'note', label: 'Note', type: 'textarea' },
  { key: 'highlight', label: 'Highlight this prize', type: 'toggle' },
  { key: 'published', label: 'Published', type: 'toggle' },
  { key: 'sortOrder', label: 'Sort order', type: 'number' },
]
const scheduleFields = computed<Field[]>(() => [
  { key: 'title', label: 'Session title', colSpan: 2, placeholder: 'Opening ceremony' },
  { key: 'competitionId', label: 'Segment', type: 'select', options: [{ value: null, label: 'Whole event' }, ...competitionOptions.value], hint: 'Leave on "Whole event" for plenary sessions.' },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'startTime', label: 'Start time', placeholder: '09:00', hint: '24-hour HH:MM.' },
  { key: 'endTime', label: 'End time', placeholder: '10:00' },
  { key: 'sessionType', label: 'Session type', placeholder: 'Ceremony / Round / Break' },
  { key: 'venue', label: 'Room or venue' },
  { key: 'speaker', label: 'Speaker' },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'published', label: 'Published', type: 'toggle' },
  { key: 'sortOrder', label: 'Sort order', type: 'number' },
])
const criteriaFields = computed<Field[]>(() => [
  { key: 'name', label: 'Criterion', colSpan: 2, placeholder: 'Innovation' },
  { key: 'description', label: 'What judges look for', type: 'textarea' },
  { key: 'competitionId', label: 'Applies to', type: 'select', options: [{ value: null, label: 'Whole event' }, ...competitionOptions.value] },
  { key: 'weight', label: 'Weight (%)', type: 'number', hint: 'Weights in one scope should total 100.' },
  { key: 'icon', label: 'Icon', placeholder: 'lucide:lightbulb' },
  { key: 'published', label: 'Published', type: 'toggle' },
  { key: 'sortOrder', label: 'Sort order', type: 'number' },
])
const announcementFields: Field[] = [
  { key: 'title', label: 'Headline', colSpan: 2, placeholder: 'Submission deadline extended' },
  { key: 'body', label: 'Details', type: 'rich' },
  { key: 'pinned', label: 'Pin to top', type: 'toggle' },
  { key: 'published', label: 'Published', type: 'toggle' },
]
</script>

<template>
  <div v-if="ev" class="space-y-6">
    <AdminPageHeader
      :title="ev.title"
      :subtitle="`${ev.year} edition · ${ev.competitions?.length ?? 0} competitions`"
      icon="lucide:calendar-days"
      back-to="/admin/events"
      back-label="Events"
    >
      <template #badge>
        <AdminStatusBadge :status="ev.status" />
        <span v-if="ev.isCurrent" class="status status-brand">Current</span>
        <span v-if="!ev.published" class="status status-warn">Draft</span>
        <span v-else class="status status-ok">Published</span>
      </template>
      <template #actions>
        <Transition enter-active-class="transition duration-200" enter-from-class="opacity-0">
          <span v-if="savedAt" class="inline-flex items-center gap-1.5 text-sm font-semibold text-green-700">
            <Icon name="lucide:circle-check-big" /> Saved {{ savedAt }}
          </span>
        </Transition>
        <a :href="previewUrl" target="_blank" rel="noopener" class="btn-secondary !py-2.5">
          <Icon name="lucide:eye" /> Preview
        </a>
        <button v-if="!ev.published" class="btn-primary !py-2.5" :disabled="saving" @click="setPublished(true)">
          <Icon name="lucide:send" /> Publish
        </button>
        <button v-else class="btn-ghost !py-2.5" :disabled="saving" @click="setPublished(false)">
          <Icon name="lucide:eye-off" /> Unpublish
        </button>
      </template>
    </AdminPageHeader>

    <!-- draft banner: says plainly what is and is not visible -->
    <div v-if="!ev.published" class="surface flex flex-wrap items-center gap-3 border-amber-200 bg-amber-50/60 p-4">
      <span class="tile tile-orange shrink-0"><Icon name="lucide:file-clock" /></span>
      <div class="min-w-0 flex-1">
        <p class="font-bold text-ink">This event is a draft</p>
        <p class="text-sm text-ink-soft">
          Nobody can see it on the public site yet. Use Preview to check it, then Publish when it is ready.
        </p>
      </div>
    </div>

    <!-- workspace tabs -->
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

    <!-- DETAILS -->
    <div v-if="tab === 'details'" class="surface fade-up p-5 sm:p-6">
      <AdminEventForm :key="ev.updatedAt" :initial="ev" :saving="saving" @submit="save" />
    </div>

    <!-- COMPETITIONS -->
    <AdminPanel
      v-else-if="tab === 'competitions'"
      title="Competitions"
      subtitle="The contests inside this edition. Add them one at a time."
      icon="lucide:trophy"
      flush
      class="fade-up"
    >
      <template #actions>
        <NuxtLink :to="`/admin/competitions/new?eventId=${ev.id}`" class="btn-primary !py-2 !text-xs">
          <Icon name="lucide:plus" /> Add competition
        </NuxtLink>
      </template>

      <div class="table-wrap">
        <table class="console-table min-w-[40rem]">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Type</th>
              <th scope="col">Registration</th>
              <th scope="col">Deadline</th>
              <th scope="col" class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="comp in ev.competitions" :key="comp.id">
              <td>
                <NuxtLink :to="`/admin/competitions/${comp.id}`" class="font-semibold text-ink hover:text-brand-700">{{ comp.name }}</NuxtLink>
              </td>
              <td class="text-ink-soft">{{ comp.type || '—' }}</td>
              <td>
                <span class="status" :class="comp.registrationOpen ? 'status-ok' : 'status-neutral'">
                  {{ comp.registrationOpen ? 'Open' : 'Closed' }}
                </span>
              </td>
              <td class="whitespace-nowrap text-ink-soft">{{ comp.registrationDeadline ?? '—' }}</td>
              <td>
                <div class="row-actions">
                  <NuxtLink :to="`/admin/competitions/${comp.id}`" class="icon-btn-sm icon-btn-brand" :aria-label="`Edit ${comp.name}`" title="Edit">
                    <Icon name="lucide:pencil" />
                  </NuxtLink>
                  <button class="icon-btn-sm icon-btn-danger" :aria-label="`Delete ${comp.name}`" title="Delete" @click="removeCompetition(comp.id, comp.name)">
                    <Icon name="lucide:trash-2" />
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!ev.competitions?.length">
              <td colspan="5" class="!p-0">
                <AdminEmptyState icon="lucide:trophy" title="No competitions yet" body="Add the contests that make up this edition — each one gets its own rules, prizes and registration window.">
                  <template #action>
                    <NuxtLink :to="`/admin/competitions/new?eventId=${ev.id}`" class="btn-primary !py-2.5">Add competition</NuxtLink>
                  </template>
                </AdminEmptyState>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </AdminPanel>

    <!-- PRIZE POOL -->
    <AdminCollection
      v-else-if="tab === 'prizes'"
      flush
      title="Prize pool"
      subtitle="Event-level prizes. Prizes for a single competition live on that competition's form."
      new-label="New prize"
      endpoint="/api/admin/event-prizes"
      :query="scope"
      :fields="prizeFields"
      :columns="[
        { key: 'title', label: 'Prize' },
        { key: 'amount', label: 'Amount' },
        { key: 'published', label: 'Live' },
        { key: 'sortOrder', label: 'Order' },
      ]"
      :defaults="{ eventId: id, highlight: false, published: true }"
      empty-text="No prizes yet. Add the champion prize first, then the runners-up."
    />

    <!-- SCHEDULE -->
    <AdminCollection
      v-else-if="tab === 'schedule'"
      flush
      title="Programme schedule"
      subtitle="The hour-by-hour agenda. The milestone timeline is edited under Timeline."
      new-label="New session"
      endpoint="/api/admin/schedule"
      :query="scope"
      :fields="scheduleFields"
      :columns="[
        { key: 'startTime', label: 'Time' },
        { key: 'title', label: 'Session' },
        { key: 'date', label: 'Date' },
        { key: 'venue', label: 'Venue' },
        { key: 'published', label: 'Live' },
      ]"
      :defaults="{ eventId: id, competitionId: null, published: true }"
      empty-text="No sessions yet. Add check-in, the opening ceremony and the rounds."
    />

    <!-- JUDGING CRITERIA -->
    <AdminCollection
      v-else-if="tab === 'criteria'"
      flush
      title="Judging criteria"
      subtitle="How entries are scored. Weights in each scope should total 100%."
      new-label="New criterion"
      endpoint="/api/admin/criteria"
      :query="scope"
      :fields="criteriaFields"
      :columns="[
        { key: 'name', label: 'Criterion' },
        { key: 'weight', label: 'Weight' },
        { key: 'published', label: 'Live' },
        { key: 'sortOrder', label: 'Order' },
      ]"
      :defaults="{ eventId: id, competitionId: null, published: true }"
      empty-text="No criteria yet. Add the ones judges will score against."
    />

    <!-- ANNOUNCEMENTS -->
    <AdminCollection
      v-else-if="tab === 'announcements'"
      flush
      title="Announcements"
      subtitle="Notices shown on this event's page. Use these for deadline changes and day-of instructions."
      new-label="New announcement"
      endpoint="/api/admin/announcements"
      :query="scope"
      :fields="announcementFields"
      :columns="[
        { key: 'title', label: 'Headline' },
        { key: 'pinned', label: 'Pinned' },
        { key: 'published', label: 'Live' },
      ]"
      :defaults="{ eventId: id, pinned: false, published: true }"
      empty-text="No announcements yet. Post one when something changes for participants."
    />
  </div>
</template>
