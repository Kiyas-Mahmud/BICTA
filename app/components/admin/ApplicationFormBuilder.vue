<script setup lang="ts">
// Purpose-built replacement for the generic Collection UI on this one screen.
// The window/required settings live on the competition row, the fields in
// application_fields, so the panel saves them through two different endpoints
// while presenting as a single "Application form" surface.
const props = defineProps<{
  competitionId: number
  required: boolean
  opensAt: string | null
  closesAt: string | null
  registrationDeadline: string | null
}>()
const emit = defineEmits<{ (e: 'saved'): void }>()

interface Field {
  id: number
  label: string
  helpText: string
  fieldType: 'text' | 'file'
  required: boolean
  sortOrder: number
}

const toast = useToast()
const { confirm } = useConfirm()

const { data: fields, refresh } = await useFetch<Field[]>('/api/admin/application-fields', {
  query: { competitionId: props.competitionId },
})

// ---- Window + required, saved onto the competition itself ----
const settings = reactive({
  required: props.required,
  opensAt: props.opensAt ?? '',
  closesAt: props.closesAt ?? '',
})
const savingSettings = ref(false)
const settingsDirty = computed(
  () =>
    settings.required !== props.required ||
    settings.opensAt !== (props.opensAt ?? '') ||
    settings.closesAt !== (props.closesAt ?? ''),
)

async function saveSettings() {
  if (settings.opensAt && settings.closesAt && settings.opensAt > settings.closesAt) {
    toast.error('Check the dates', 'The window cannot close before it opens.')
    return
  }
  savingSettings.value = true
  try {
    await $fetch(`/api/admin/competitions/${props.competitionId}/application-settings`, {
      method: 'PUT',
      body: {
        applicationRequired: settings.required,
        applicationOpensAt: settings.opensAt || null,
        applicationClosesAt: settings.closesAt || null,
      },
    })
    toast.success('Application settings saved')
    emit('saved')
  } catch (e: any) {
    toast.error('Could not save', e?.data?.statusMessage ?? 'Try again in a moment.')
  } finally {
    savingSettings.value = false
  }
}

// The effective close date, so the admin sees what participants will see.
const effectiveClose = computed(() => settings.closesAt || props.registrationDeadline || '')

// ---- Fields ----
const blank = () => ({ id: 0, label: '', helpText: '', fieldType: 'text' as const, required: true, sortOrder: 0 })
const draft = ref<Field | null>(null)
const savingField = ref(false)

function addField() {
  draft.value = { ...blank(), sortOrder: (fields.value?.length ?? 0) + 1 }
}
function editField(f: Field) {
  draft.value = { ...f }
}

async function saveField() {
  const d = draft.value
  if (!d || !d.label.trim()) {
    toast.error('Give the field a label')
    return
  }
  savingField.value = true
  try {
    const body = {
      competitionId: props.competitionId,
      label: d.label.trim(),
      helpText: d.helpText?.trim() ?? '',
      fieldType: d.fieldType,
      required: d.required,
      sortOrder: d.sortOrder,
    }
    if (d.id) {
      await $fetch(`/api/admin/application-fields/${d.id}`, { method: 'PUT', body })
    } else {
      await $fetch('/api/admin/application-fields', { method: 'POST', body })
    }
    draft.value = null
    await refresh()
    toast.success(d.id ? 'Field updated' : 'Field added')
  } catch (e: any) {
    toast.error('Could not save the field', e?.data?.statusMessage ?? 'Try again in a moment.')
  } finally {
    savingField.value = false
  }
}

async function removeField(f: Field) {
  const ok = await confirm({
    title: `Delete "${f.label}"?`,
    body: 'Answers teams already submitted for this field are deleted with it. This cannot be undone.',
    confirmLabel: 'Delete field',
    tone: 'danger',
  })
  if (!ok) return
  try {
    await $fetch(`/api/admin/application-fields/${f.id}`, { method: 'DELETE' })
    await refresh()
    toast.success('Field deleted')
  } catch (e: any) {
    toast.error('Could not delete', e?.data?.statusMessage ?? 'Try again in a moment.')
  }
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') draft.value = null
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

const typeMeta = {
  text: { icon: 'lucide:align-left', label: 'Text answer' },
  file: { icon: 'lucide:paperclip', label: 'File upload' },
} as const
</script>

<template>
  <AdminPanel
    title="Application form"
    subtitle="Extra questions teams answer for this competition, and when they can answer them."
    icon="lucide:clipboard-list"
  >
    <template #actions>
      <button type="button" class="btn-secondary !py-2 text-sm" @click="addField">
        <Icon name="lucide:plus" /> Add field
      </button>
    </template>

    <!-- Window + required -->
    <div class="rounded-2xl border border-line bg-mist-1/60 p-4 sm:p-5">
      <div class="grid gap-4 sm:grid-cols-2">
        <AdminSwitch
          v-model="settings.required"
          class="sm:col-span-2 !bg-white"
          label="Required to register"
          hint="On: teams must complete the form before their entry is accepted. Off: they can register now and submit from their dashboard."
        />
        <div>
          <label class="label" for="app-opens">Submissions open</label>
          <input id="app-opens" v-model="settings.opensAt" type="date" class="input" />
          <p class="mt-1.5 text-xs text-ink-faint">Leave blank to open as soon as registration does.</p>
        </div>
        <div>
          <label class="label" for="app-closes">Submissions close</label>
          <input id="app-closes" v-model="settings.closesAt" type="date" class="input" />
          <p class="mt-1.5 text-xs text-ink-faint">
            <template v-if="!settings.closesAt && registrationDeadline">
              Blank, so it follows the registration deadline ({{ registrationDeadline }}).
            </template>
            <template v-else-if="!settings.closesAt">Leave blank for no closing date.</template>
            <template v-else>Teams cannot edit their answers after this date.</template>
          </p>
        </div>
      </div>

      <div class="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" class="btn-primary !py-2 text-sm" :disabled="savingSettings || !settingsDirty" @click="saveSettings">
          <Icon :name="savingSettings ? 'lucide:loader-2' : 'lucide:check'" :class="{ 'animate-spin': savingSettings }" />
          {{ savingSettings ? 'Saving…' : 'Save settings' }}
        </button>
        <p class="text-xs text-ink-faint">
          <template v-if="settingsDirty">Unsaved changes.</template>
          <template v-else-if="effectiveClose">Participants see this window on their dashboard. Closes {{ effectiveClose }}.</template>
          <template v-else>Participants see this window on their dashboard.</template>
        </p>
      </div>
    </div>

    <!-- Field editor -->
    <div v-if="draft" class="mt-4 rounded-2xl border border-brand-200 bg-brand-50/40 p-4 sm:p-5">
      <div class="flex items-center justify-between gap-3">
        <p class="text-sm font-extrabold text-ink">{{ draft.id ? 'Edit field' : 'New field' }}</p>
        <button type="button" class="icon-btn-sm" aria-label="Cancel" @click="draft = null"><Icon name="lucide:x" /></button>
      </div>

      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        <div class="sm:col-span-2">
          <label class="label" for="f-label">Question</label>
          <input id="f-label" v-model="draft.label" class="input" placeholder="e.g. Link to your project repository" maxlength="200" />
        </div>
        <div class="sm:col-span-2">
          <label class="label" for="f-help">Help text</label>
          <input id="f-help" v-model="draft.helpText" class="input" placeholder="Optional guidance shown under the question" maxlength="500" />
        </div>
        <div>
          <label class="label">Answer type</label>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="(meta, key) in typeMeta"
              :key="key"
              type="button"
              class="flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors"
              :class="draft.fieldType === key
                ? 'border-brand-400 bg-white text-brand-800 shadow-soft'
                : 'border-line bg-white/60 text-ink-soft hover:border-brand-200 hover:text-ink'"
              @click="draft.fieldType = key"
            >
              <Icon :name="meta.icon" /> {{ meta.label }}
            </button>
          </div>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="label" for="f-order">Order</label>
            <input id="f-order" v-model.number="draft.sortOrder" type="number" min="0" max="1000" class="input" />
          </div>
          <AdminSwitch v-model="draft.required" class="self-end !bg-white" label="Answer required" />
        </div>
      </div>

      <div class="mt-4 flex items-center gap-2">
        <button type="button" class="btn-primary !py-2 text-sm" :disabled="savingField" @click="saveField">
          <Icon :name="savingField ? 'lucide:loader-2' : 'lucide:check'" :class="{ 'animate-spin': savingField }" />
          {{ savingField ? 'Saving…' : 'Save field' }}
        </button>
        <button type="button" class="btn-secondary !py-2 text-sm" :disabled="savingField" @click="draft = null">Cancel</button>
        <span class="ml-auto text-xs text-ink-faint">Press Escape to cancel</span>
      </div>
    </div>

    <!-- Field list -->
    <ul v-if="fields?.length" class="mt-4 space-y-2">
      <li
        v-for="f in fields"
        :key="f.id"
        class="flex items-center gap-3 rounded-xl border border-line bg-white p-3 sm:px-4"
      >
        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-mist-1 text-ink-soft">
          <Icon :name="typeMeta[f.fieldType].icon" />
        </span>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-bold text-ink">
            {{ f.label }}<span v-if="f.required" class="ml-0.5 text-red-500">*</span>
          </p>
          <p class="truncate text-xs text-ink-faint">
            {{ typeMeta[f.fieldType].label }} · position {{ f.sortOrder }}
            <template v-if="f.helpText"> · {{ f.helpText }}</template>
          </p>
        </div>
        <div class="flex shrink-0 items-center gap-1">
          <button type="button" class="icon-btn-sm icon-btn-brand" aria-label="Edit field" @click="editField(f)">
            <Icon name="lucide:pencil" />
          </button>
          <button type="button" class="icon-btn-sm icon-btn-danger" aria-label="Delete field" @click="removeField(f)">
            <Icon name="lucide:trash-2" />
          </button>
        </div>
      </li>
    </ul>

    <AdminEmptyState
      v-else-if="!draft"
      class="mt-4"
      icon="lucide:clipboard-list"
      title="No custom fields yet"
      body="Applicants only see the standard registration form. Add a field to ask for a repository link, a pitch deck, or anything else."
    />
  </AdminPanel>
</template>
