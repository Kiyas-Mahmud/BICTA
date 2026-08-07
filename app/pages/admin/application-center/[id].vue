<script setup lang="ts">
// One team's preliminary submission. Deliberately narrow: the answers are the
// point of this page, so the decision lives in a sticky bar rather than
// competing with them for attention.
definePageMeta({ layout: 'admin', middleware: 'admin' })

interface Answer {
  fieldId: number
  label: string
  helpText: string
  fieldType: 'text' | 'file'
  required: boolean
  textValue: string | null
  fileUrl: string | null
  fileName: string | null
  updatedAt: string | null
}
interface Payload {
  team: {
    id: number
    teamName: string | null
    fullName: string
    email: string
    phone: string
    institution: string
    notes: string | null
    status: 'pending' | 'confirmed' | 'rejected'
    decisionNote: string | null
    decisionAt: string | null
    decisionNotifiedAt: string | null
    createdAt: string
  }
  competition: { id: number | null; name: string; eventTitle: string; resultsAnnounceAt: string | null }
  roster: { role: 'leader' | 'member'; fullName: string; email: string; status: string }[]
  answers: Answer[]
}

const route = useRoute()
const router = useRouter()
const id = Number(route.params.id)
const toast = useToast()
const { confirm } = useConfirm()

const { data, refresh, pending } = await useFetch<Payload>(`/api/admin/application-center/${id}`)

const note = ref('')
watch(data, () => { note.value = data.value?.team.decisionNote ?? '' }, { immediate: true })
const busy = ref(false)

const embargo = computed(() => data.value?.competition.resultsAnnounceAt ?? null)

async function decide(status: 'confirmed' | 'rejected' | 'pending') {
  const verb = status === 'confirmed' ? 'Accept' : status === 'rejected' ? 'Reject' : 'Reopen'
  const ok = await confirm({
    title: `${verb} ${data.value?.team.teamName || data.value?.team.fullName}?`,
    body:
      status === 'pending'
        ? 'The decision is cleared and the team returns to the review queue.'
        : embargo.value
          ? `The team is emailed on ${embargo.value}, not now.`
          : 'The team is emailed their result immediately.',
    confirmLabel: verb,
    tone: status === 'rejected' ? 'danger' : 'brand',
  })
  if (!ok) return

  busy.value = true
  try {
    await $fetch(`/api/admin/registrations/${id}`, {
      method: 'PUT',
      body: { status, decisionNote: note.value.trim() || null },
    })
    await refresh()
    toast.success(
      status === 'pending' ? 'Reopened for review' : status === 'confirmed' ? 'Team accepted' : 'Team rejected',
      embargo.value && status !== 'pending' ? `Email scheduled for ${embargo.value}.` : undefined,
    )
  } catch (e: any) {
    toast.error('Could not save the decision', e?.data?.statusMessage ?? 'Try again in a moment.')
  } finally {
    busy.value = false
  }
}

const statusBadge = computed(() => {
  const s = data.value?.team.status
  return s === 'confirmed' ? 'badge badge-green' : s === 'rejected' ? 'badge badge-orange' : 'badge badge-amber'
})
const statusLabel = computed(() => {
  const s = data.value?.team.status
  return s === 'confirmed' ? 'Accepted' : s === 'rejected' ? 'Rejected' : 'Awaiting review'
})

useSeoMeta({ title: () => data.value?.team.teamName || 'Application', robots: 'noindex' })
</script>

<template>
  <div v-if="data" class="space-y-4">
    <AdminPageHeader
      :title="data.team.teamName || data.team.fullName"
      :subtitle="`${data.competition.eventTitle} · ${data.competition.name}`"
      icon="lucide:file-text"
      back-to="/admin/application-center"
      back-label="Back to applications"
    >
      <template #badge>
        <span :class="statusBadge">{{ statusLabel }}</span>
        <span v-if="data.team.status !== 'pending' && !data.team.decisionNotifiedAt" class="status status-warn">
          Email scheduled
        </span>
      </template>
    </AdminPageHeader>

    <!-- The submission itself -->
    <AdminPanel title="Application" icon="lucide:clipboard-list" class="fade-up">
      <template #actions>
        <span class="status status-neutral">Submitted {{ formatDate(data.team.createdAt) }}</span>
      </template>

      <dl v-if="data.answers.length" class="space-y-3">
        <div v-for="a in data.answers" :key="a.fieldId" class="rounded-xl border border-line p-4">
          <dt class="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-ink-faint">
            {{ a.label }}
            <span v-if="a.required" class="text-red-500">*</span>
          </dt>
          <p v-if="a.helpText" class="mt-0.5 text-xs text-ink-faint">{{ a.helpText }}</p>
          <dd class="mt-2 break-words text-sm leading-relaxed text-ink">
            <a
              v-if="a.fileUrl"
              :href="a.fileUrl"
              target="_blank"
              rel="noopener"
              class="inline-flex items-center gap-2 rounded-lg bg-mist-1 px-3 py-2 font-semibold text-brand-700 transition-colors hover:bg-brand-50"
            >
              <Icon name="lucide:paperclip" /> {{ a.fileName || 'View file' }}
            </a>
            <span v-else-if="a.textValue" class="whitespace-pre-wrap">{{ a.textValue }}</span>
            <span v-else class="italic text-ink-faint">Not answered</span>
          </dd>
        </div>
      </dl>

      <AdminEmptyState
        v-else
        icon="lucide:clipboard-list"
        title="This competition has no application form"
        body="Add fields on the competition page to collect a preliminary submission."
      />
    </AdminPanel>

    <!-- Who submitted it -->
    <AdminPanel title="Team" icon="lucide:users" class="fade-up stagger-1">
      <dl class="grid gap-4 sm:grid-cols-3">
        <div><dt class="text-xs font-bold text-ink-faint">Leader</dt><dd class="text-sm text-ink">{{ data.team.fullName }}</dd></div>
        <div><dt class="text-xs font-bold text-ink-faint">Email</dt><dd class="break-all text-sm text-ink">{{ data.team.email }}</dd></div>
        <div><dt class="text-xs font-bold text-ink-faint">Phone</dt><dd class="text-sm text-ink">{{ data.team.phone }}</dd></div>
        <div class="sm:col-span-3">
          <dt class="text-xs font-bold text-ink-faint">Institution</dt>
          <dd class="text-sm text-ink">{{ data.team.institution || '—' }}</dd>
        </div>
        <div v-if="data.team.notes" class="sm:col-span-3">
          <dt class="text-xs font-bold text-ink-faint">Notes from the team</dt>
          <dd class="text-sm text-ink">{{ data.team.notes }}</dd>
        </div>
      </dl>

      <ul v-if="data.roster.length" class="mt-4 flex flex-wrap gap-1.5">
        <li
          v-for="m in data.roster"
          :key="m.email"
          class="inline-flex items-center gap-1.5 rounded-lg bg-mist-1 px-2 py-1 text-xs text-ink-soft"
        >
          <Icon :name="m.role === 'leader' ? 'lucide:crown' : 'lucide:user'" class="text-ink-faint" />
          <span class="font-semibold text-ink">{{ m.fullName }}</span>
          <span class="badge" :class="m.status === 'active' ? 'badge-green' : 'badge-amber'">{{ m.status }}</span>
        </li>
      </ul>
    </AdminPanel>

    <!-- Decision -->
    <AdminPanel title="Decision" icon="lucide:gavel" class="fade-up stagger-2">
      <template #actions>
        <span v-if="embargo" class="status status-neutral">Results announce {{ embargo }}</span>
      </template>

      <label class="label" for="d-note">Note to the team (optional)</label>
      <textarea
        id="d-note"
        v-model="note"
        class="input"
        rows="3"
        maxlength="1000"
        placeholder="Included in the result email — feedback, next steps, or why they were not selected."
      />

      <div class="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          class="btn-primary !py-2.5 text-sm"
          :disabled="busy || data.team.status === 'confirmed'"
          @click="decide('confirmed')"
        >
          <Icon name="lucide:check" /> Accept team
        </button>
        <button
          type="button"
          class="btn-secondary !py-2.5 text-sm"
          :disabled="busy || data.team.status === 'rejected'"
          @click="decide('rejected')"
        >
          <Icon name="lucide:x" /> Reject
        </button>
        <button
          v-if="data.team.status !== 'pending'"
          type="button"
          class="btn-secondary !py-2.5 text-sm"
          :disabled="busy"
          @click="decide('pending')"
        >
          <Icon name="lucide:rotate-ccw" /> Reopen
        </button>
        <button type="button" class="btn-secondary !py-2.5 text-sm ml-auto" @click="router.push('/admin/application-center')">
          Back to list
        </button>
      </div>

      <p v-if="data.team.decisionAt" class="mt-3 text-xs text-ink-faint">
        Decided {{ formatDate(data.team.decisionAt) }}.
        <template v-if="data.team.decisionNotifiedAt">Team emailed {{ formatDate(data.team.decisionNotifiedAt) }}.</template>
        <template v-else>Email not sent yet.</template>
      </p>
    </AdminPanel>
  </div>

  <AdminSkeletonRows v-else-if="pending" :rows="6" />
</template>
