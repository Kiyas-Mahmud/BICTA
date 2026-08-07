<script setup lang="ts">
// Self-fetching, mirrors AdminTeamManager.vue's shape. Read-only for every
// team member; an "Edit answers" toggle appears only for the leader while
// canEdit is true (pending decision, before the deadline).
const props = defineProps<{ registrationId: number }>()

interface Field {
  id: number
  label: string
  helpText: string
  fieldType: 'text' | 'file'
  required: boolean
  textValue: string | null
  fileUrl: string | null
  fileName: string | null
}
interface Data {
  canEdit: boolean
  required: boolean
  window: { state: 'open' | 'upcoming' | 'closed'; opensAt: string | null; closesAt: string | null }
  fields: Field[]
}

const { data, refresh, pending } = await useFetch<Data>(`/api/participant/team/${props.registrationId}/application`)
const toast = useToast()

// One line telling the team exactly where they stand in the window.
const windowNote = computed(() => {
  const w = data.value?.window
  if (!w) return null
  if (w.state === 'upcoming') return { tone: 'badge-blue', text: `Opens ${formatDate(w.opensAt!)}` }
  if (w.state === 'closed') return { tone: 'badge-gray', text: 'Submissions closed' }
  if (w.closesAt) return { tone: 'badge-amber', text: `Open until ${formatDate(w.closesAt)}` }
  return { tone: 'badge-green', text: 'Open' }
})
const unanswered = computed(
  () => (data.value?.fields ?? []).filter((f) => f.required && !f.textValue && !f.fileUrl).length,
)

const editing = ref(false)
const draftAnswers = reactive<Record<number, string>>({})
const draftFiles = reactive<Record<number, File | null>>({})
const saving = ref(false)
const error = ref('')

function startEdit() {
  for (const f of data.value?.fields ?? []) {
    if (f.fieldType === 'text') draftAnswers[f.id] = f.textValue ?? ''
  }
  editing.value = true
  error.value = ''
}
function onFileChange(fieldId: number, e: Event) {
  draftFiles[fieldId] = (e.target as HTMLInputElement).files?.[0] ?? null
}

async function save() {
  saving.value = true
  error.value = ''
  try {
    const answers = (data.value?.fields ?? [])
      .filter((f) => f.fieldType === 'text')
      .map((f) => ({ fieldId: f.id, value: draftAnswers[f.id] ?? '' }))
    const hasFile = Object.values(draftFiles).some(Boolean)
    if (hasFile) {
      const fd = new FormData()
      fd.append('payload', JSON.stringify({ answers }))
      for (const [fieldId, file] of Object.entries(draftFiles)) {
        if (file) fd.append(`file_${fieldId}`, file)
      }
      await $fetch(`/api/participant/team/${props.registrationId}/application`, { method: 'PUT', body: fd })
    } else {
      await $fetch(`/api/participant/team/${props.registrationId}/application`, { method: 'PUT', body: { answers } })
    }
    editing.value = false
    for (const k of Object.keys(draftFiles)) delete draftFiles[Number(k)]
    await refresh()
    toast.success('Application updated')
  } catch (e: any) {
    error.value = e?.data?.statusMessage ?? 'Could not save. Try again.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div v-if="!pending && data?.fields.length" class="mt-5">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex flex-wrap items-center gap-2">
        <p class="text-xs font-bold uppercase tracking-wide text-ink-faint">Application</p>
        <span v-if="windowNote" class="badge" :class="windowNote.tone">{{ windowNote.text }}</span>
        <span v-if="data.required" class="badge badge-gray">Required</span>
      </div>
      <button v-if="data.canEdit && !editing" type="button" class="text-xs font-bold text-brand-600 hover:underline" @click="startEdit">
        Edit answers
      </button>
    </div>

    <p
      v-if="data.window.state === 'upcoming'"
      class="mt-2.5 flex items-start gap-2 rounded-xl bg-mist-1 px-3.5 py-2.5 text-xs text-ink-soft"
    >
      <Icon name="lucide:clock" class="mt-0.5 shrink-0 text-brand-600" />
      <span>Submissions open on <strong class="text-ink">{{ formatDate(data.window.opensAt) }}</strong>. You can review the questions now and answer them from here once the window opens.</span>
    </p>
    <p
      v-else-if="data.window.state === 'closed'"
      class="mt-2.5 flex items-start gap-2 rounded-xl bg-mist-1 px-3.5 py-2.5 text-xs text-ink-soft"
    >
      <Icon name="lucide:lock" class="mt-0.5 shrink-0 text-ink-faint" />
      <span>The submission window closed<template v-if="data.window.closesAt"> on <strong class="text-ink">{{ formatDate(data.window.closesAt) }}</strong></template>. Your answers are final.</span>
    </p>
    <p
      v-else-if="unanswered && data.canEdit"
      class="mt-2.5 flex items-start gap-2 rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs font-semibold text-amber-800"
    >
      <Icon name="lucide:triangle-alert" class="mt-0.5 shrink-0" />
      <span>{{ unanswered }} required {{ unanswered === 1 ? 'question is' : 'questions are' }} still unanswered.</span>
    </p>

    <!-- read-only -->
    <dl v-if="!editing" class="mt-3 space-y-2.5">
      <div v-for="f in data.fields" :key="f.id" class="rounded-xl border border-line p-3.5">
        <dt class="text-xs font-bold text-ink-faint">{{ f.label }}</dt>
        <dd class="mt-1 text-sm text-ink">
          <a v-if="f.fileUrl" :href="f.fileUrl" target="_blank" rel="noopener" class="inline-flex items-center gap-1.5 font-semibold text-brand-600 hover:underline">
            <Icon name="lucide:paperclip" /> {{ f.fileName || 'View file' }}
          </a>
          <span v-else-if="f.textValue">{{ f.textValue }}</span>
          <span v-else class="text-ink-faint">Not answered</span>
        </dd>
      </div>
    </dl>

    <!-- edit -->
    <div v-else class="mt-3 space-y-3 rounded-xl border border-line p-4">
      <div v-for="f in data.fields" :key="f.id">
        <label class="text-xs font-bold text-ink-faint">{{ f.label }}<span v-if="f.required" class="text-red-500">*</span></label>
        <p v-if="f.helpText" class="mt-0.5 text-xs text-ink-soft">{{ f.helpText }}</p>
        <textarea v-if="f.fieldType === 'text'" v-model="draftAnswers[f.id]" class="field mt-1.5 w-full text-sm" rows="2" />
        <template v-else>
          <input type="file" class="field mt-1.5 w-full text-sm" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp" @change="onFileChange(f.id, $event)" />
          <p v-if="f.fileUrl" class="mt-1 text-xs text-ink-faint">Current: {{ f.fileName }} — choose a new file to replace it.</p>
        </template>
      </div>

      <p v-if="error" class="form-error">{{ error }}</p>

      <div class="flex gap-2">
        <button type="button" class="btn-primary !py-2 text-sm" :disabled="saving" @click="save">
          <Icon :name="saving ? 'lucide:loader-2' : 'lucide:check'" :class="{ 'animate-spin': saving }" />
          {{ saving ? 'Saving…' : 'Save' }}
        </button>
        <button type="button" class="btn-ghost !py-2 text-sm" :disabled="saving" @click="editing = false">Cancel</button>
      </div>
    </div>
  </div>
</template>
