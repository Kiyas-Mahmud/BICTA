<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const saving = ref(false)
const toast = useToast()

// A new event is always created as a draft: it should never appear publicly the
// instant it is saved. Publishing is a separate, deliberate step after preview.
async function create(data: any) {
  saving.value = true
  try {
    const row = await $fetch<{ id: number }>('/api/admin/events', {
      method: 'POST',
      body: { ...data, published: false },
    })
    clearDraft()
    toast.success('Draft created', 'Add competitions and the rest, then preview and publish.')
    await navigateTo(`/admin/events/${row.id}`)
  } catch (e: any) {
    toast.error('Could not create the event', e?.data?.statusMessage ?? 'Check the fields and try again.')
  } finally {
    saving.value = false
  }
}

// ---- Local autosave -------------------------------------------------------
// The form is long, and there is no event row to save into until it is created,
// so work in progress is kept in the browser. A refresh, an accidental tab
// close or a mis-click on the back button no longer loses everything typed.
const DRAFT_KEY = 'bicta:admin:new-event-draft'
const restored = ref<Record<string, any> | null>(null)
const savedDraftAt = ref('')
const hasDraft = ref(false)

onMounted(() => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw)
    if (parsed?.data && typeof parsed.data === 'object') {
      restored.value = parsed.data
      hasDraft.value = true
      savedDraftAt.value = parsed.savedAt ?? ''
    }
  } catch {
    // A corrupt draft is not worth surfacing; start clean.
    localStorage.removeItem(DRAFT_KEY)
  }
})

function onDraft(data: Record<string, any>) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ data, savedAt: new Date().toISOString() }))
    savedDraftAt.value = new Date().toISOString()
    hasDraft.value = true
  } catch {
    // Private mode or a full quota: autosave is a convenience, never a blocker.
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch {
    /* nothing to clean up */
  }
  hasDraft.value = false
  savedDraftAt.value = ''
}

function discardDraft() {
  clearDraft()
  // Remount the form so it falls back to empty defaults.
  reloadNuxtApp({ path: '/admin/events/new', ttl: 0 })
}

const savedLabel = computed(() =>
  savedDraftAt.value ? new Date(savedDraftAt.value).toLocaleTimeString() : '',
)
</script>

<template>
  <div class="space-y-6">
    <AdminPageHeader
      title="New event"
      subtitle="Fill in as much as you like — everything is on this one page. It saves as a draft, so nothing goes public until you publish it."
      icon="lucide:calendar-plus"
      back-to="/admin/events"
      back-label="Events"
    >
      <template #actions>
        <Transition enter-active-class="transition duration-200" enter-from-class="opacity-0">
          <span v-if="savedLabel" class="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft">
            <Icon name="lucide:cloud-check" /> Draft kept {{ savedLabel }}
          </span>
        </Transition>
      </template>
    </AdminPageHeader>

    <div v-if="hasDraft && restored" class="surface flex flex-wrap items-center gap-3 border-brand-200 bg-brand-50/50 p-4">
      <span class="tile tile-blue shrink-0"><Icon name="lucide:rotate-ccw" /></span>
      <div class="min-w-0 flex-1">
        <p class="font-bold text-ink">Unsaved work restored</p>
        <p class="text-sm text-ink-soft">
          We brought back what you had typed before. It stays in this browser until the event is created.
        </p>
      </div>
      <button type="button" class="btn-ghost !py-2 !text-xs" @click="discardDraft">
        <Icon name="lucide:trash-2" /> Start fresh
      </button>
    </div>

    <div class="surface fade-up stagger-1 p-5 sm:p-6">
      <AdminEventForm :initial="restored ?? undefined" :saving="saving" @submit="create" @draft="onDraft" />
    </div>
  </div>
</template>
