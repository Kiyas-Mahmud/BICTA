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
interface Data { canEdit: boolean; fields: Field[] }

const { data, refresh, pending } = await useFetch<Data>(`/api/participant/team/${props.registrationId}/application`)
const toast = useToast()

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
    <div class="flex items-center justify-between">
      <p class="text-xs font-bold uppercase tracking-wide text-ink-faint">Application</p>
      <button v-if="data.canEdit && !editing" type="button" class="text-xs font-bold text-brand-600 hover:underline" @click="startEdit">
        Edit answers
      </button>
    </div>

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
