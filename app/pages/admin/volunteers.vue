<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const { data: volunteers, refresh } = await useFetch<{ id: number; name: string; email: string }[]>('/api/admin/volunteers')
const { data: tree } = await useFetch('/api/admin/event-tree', { key: 'admin-event-tree' })

const form = reactive({ name: '', email: '' })
const adding = ref(false)
const error = ref('')
const toast = useToast()
const { confirm } = useConfirm()

// --- assignment editor -------------------------------------------------
// A volunteer works one event and any number of its competitions; the server
// rejects a mixed-event list and scopes the scanner to whatever is saved here.
const assigning = ref<{ id: number; name: string } | null>(null)
const assigned = ref<number[]>([])
const staffedPoints = ref<number[]>([])
const savingAssign = ref(false)

// Check-in points of the current event, for the staffing picker.
const { data: allCheckpoints } = await useFetch<{ id: number; name: string; location: string; competitionId: number | null }[]>(
  '/api/admin/checkpoints',
)
// Only offer desks that match the competitions being assigned (plus the
// event-wide ones), so staffing can never contradict the scope.
const staffableCheckpoints = computed(() =>
  (allCheckpoints.value ?? []).filter(
    (cp) => cp.competitionId === null || assigned.value.includes(cp.competitionId),
  ),
)
function togglePoint(id: number) {
  staffedPoints.value = staffedPoints.value.includes(id)
    ? staffedPoints.value.filter((x) => x !== id)
    : [...staffedPoints.value, id]
}

const compName = computed(() => {
  const map = new Map<number, string>()
  for (const e of tree.value ?? []) for (const c of e.competitions) map.set(c.id, c.name)
  return map
})
// Assignment summary per volunteer, loaded once for the table.
const summary = ref<Record<number, number[]>>({})
async function loadSummary() {
  const rows = await Promise.all(
    (volunteers.value ?? []).map(async (v) => {
      try {
        const r = await $fetch<{ competitionIds: number[] }>(`/api/admin/volunteers/${v.id}/assignments`)
        return [v.id, r.competitionIds] as const
      } catch {
        return [v.id, []] as const
      }
    }),
  )
  summary.value = Object.fromEntries(rows)
}
await loadSummary()

async function startAssign(v: { id: number; name: string }) {
  assigning.value = v
  assigned.value = summary.value[v.id] ?? []
  staffedPoints.value = []
  try {
    const r = await $fetch<{ checkpointIds: number[] }>(`/api/admin/volunteers/${v.id}/checkpoints`)
    staffedPoints.value = r.checkpointIds
  } catch {
    // Staffing is additive; a failure here must not block editing the scope.
  }
}

async function saveAssignments() {
  if (!assigning.value) return
  savingAssign.value = true
  try {
    const id = assigning.value.id
    await $fetch(`/api/admin/volunteers/${id}/assignments`, {
      method: 'PUT',
      body: { competitionIds: assigned.value },
    })
    // Drop any staffed desk that the (possibly narrowed) scope no longer covers.
    const valid = staffedPoints.value.filter((cid) =>
      staffableCheckpoints.value.some((cp) => cp.id === cid),
    )
    await $fetch(`/api/admin/volunteers/${id}/checkpoints`, {
      method: 'PUT',
      body: { checkpointIds: valid },
    })
    toast.success(`${assigning.value.name}'s assignment saved`)
    assigning.value = null
    await loadSummary()
  } catch (e: any) {
    toast.error('Could not save the assignment', e?.data?.statusMessage ?? 'Try again.')
  } finally {
    savingAssign.value = false
  }
}

async function add() {
  error.value = ''
  adding.value = true
  try {
    await $fetch('/api/admin/volunteers', { method: 'POST', body: { name: form.name, email: form.email } })
    toast.success(`Invitation sent to ${form.email}`, 'They set their own password from the emailed link.')
    form.name = ''
    form.email = ''
    await Promise.all([refresh(), refreshAdminStats()])
  } catch (e: any) {
    error.value = e?.data?.statusMessage ?? 'Could not invite volunteer.'
  } finally {
    adding.value = false
  }
}

// ---- edit / ban / re-invite -------------------------------------------
const editing = ref<{ id: number; name: string; email: string } | null>(null)
const savingEdit = ref(false)

function startEdit(v: { id: number; name: string; email: string }) {
  editing.value = { id: v.id, name: v.name, email: v.email }
  error.value = ''
}

async function saveEdit() {
  const e = editing.value
  if (!e) return
  savingEdit.value = true
  try {
    await $fetch(`/api/admin/volunteers/${e.id}`, { method: 'PUT', body: { name: e.name, email: e.email } })
    editing.value = null
    await refresh()
    toast.success('Volunteer updated')
  } catch (err: any) {
    error.value = err?.data?.statusMessage ?? 'Could not save.'
  } finally {
    savingEdit.value = false
  }
}

async function setBanned(v: { id: number; name: string; email: string; status: string }, banned: boolean) {
  const ok = await confirm({
    title: banned ? `Ban ${v.name}?` : `Restore ${v.name}?`,
    body: banned
      ? 'They are signed out and refused at login straight away. Their record and past check-ins are kept.'
      : 'They can sign in again with their existing password.',
    confirmLabel: banned ? 'Ban volunteer' : 'Restore',
    tone: banned ? 'danger' : 'brand',
  })
  if (!ok) return
  try {
    await $fetch(`/api/admin/volunteers/${v.id}`, {
      method: 'PUT',
      body: { name: v.name, email: v.email, status: banned ? 'banned' : 'active' },
    })
    await refresh()
    toast.success(banned ? `${v.name} banned` : `${v.name} restored`)
  } catch (err: any) {
    toast.error('Could not update', err?.data?.statusMessage ?? 'Try again in a moment.')
  }
}

async function resendInvite(v: { id: number; name: string; email: string }) {
  const ok = await confirm({
    title: `Send a new invitation to ${v.name}?`,
    body: 'Any earlier link stops working, and their current password (if they set one) is cleared until they use the new link.',
    confirmLabel: 'Send invitation',
  })
  if (!ok) return
  try {
    await $fetch(`/api/admin/volunteers/${v.id}/resend-invite`, { method: 'POST' })
    await refresh()
    toast.success(`Invitation sent to ${v.email}`)
  } catch (err: any) {
    toast.error('Could not send', err?.data?.statusMessage ?? 'Try again in a moment.')
  }
}

function statusOf(v: { status?: string }) {
  if (v.status === 'banned') return { label: 'Banned', cls: 'badge badge-orange' }
  if (v.status === 'invited') return { label: 'Invited', cls: 'badge badge-amber' }
  return { label: 'Active', cls: 'badge badge-green' }
}

async function remove(id: number, name: string) {
  const ok = await confirm({
    title: `Remove ${name}?`,
    body: 'They lose access to the scanner immediately. Check-ins they already recorded are kept.',
    confirmLabel: 'Remove volunteer',
  })
  if (!ok) return
  await $fetch(`/api/admin/volunteers/${id}`, { method: 'DELETE' })
  await Promise.all([refresh(), refreshAdminStats()])
  await loadSummary()
  toast.success(`${name} removed`)
}

async function copyEmail(email: string) {
  try {
    await navigator.clipboard.writeText(email)
    toast.info('Email copied')
  } catch {
    toast.error('Could not copy that email')
  }
}
</script>

<template>
  <div class="space-y-6">
    <AdminPageHeader title="Scanner Volunteers" icon="lucide:scan-line">
      <template #subtitle>
        Event-day staff who sign in at
        <code class="rounded bg-mist-2 px-1.5 py-0.5 text-xs font-semibold text-ink">/login</code>
        and land straight on the QR scanner. Scan only — no admin access.
      </template>
    </AdminPageHeader>

    <div class="grid gap-5 lg:grid-cols-[1fr_21rem]">
      <!-- list -->
      <AdminPanel
        title="Active volunteers"
        :subtitle="`${volunteers?.length ?? 0} with scanner access`"
        icon="lucide:users"
        flush
        class="fade-up stagger-1"
      >
        <div class="table-wrap">
          <table class="console-table min-w-[26rem]">
            <thead>
              <tr>
                <th scope="col">Volunteer</th>
                <th scope="col">Status</th>
                <th scope="col">Email</th>
                <th scope="col">Assigned competitions</th>
                <th scope="col" class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="v in volunteers" :key="v.id">
                <td>
                  <div class="flex items-center gap-3">
                    <AdminAvatar :name="v.name" />
                    <span class="font-semibold text-ink">{{ v.name }}</span>
                  </div>
                </td>
                <td><span :class="statusOf(v).cls">{{ statusOf(v).label }}</span></td>
                <td class="text-ink-soft">{{ v.email }}</td>
                <td>
                  <div v-if="summary[v.id]?.length" class="flex flex-wrap gap-1.5">
                    <span v-for="cid in summary[v.id]" :key="cid" class="status status-brand">{{ compName.get(cid) ?? `#${cid}` }}</span>
                  </div>
                  <span v-else class="status status-neutral" title="Unassigned volunteers can use every check-in point">
                    All (unassigned)
                  </span>
                </td>
                <td>
                  <div class="row-actions">
                    <button class="icon-btn-sm icon-btn-brand" :aria-label="`Assign ${v.name}`" title="Assign competitions" @click="startAssign(v)">
                      <Icon name="lucide:list-checks" />
                    </button>
                    <button class="icon-btn-sm icon-btn-brand" :aria-label="`Edit ${v.name}`" title="Edit" @click="startEdit(v)">
                      <Icon name="lucide:pencil" />
                    </button>
                    <button class="icon-btn-sm icon-btn-brand" :aria-label="`Re-invite ${v.name}`" title="Send a new invitation" @click="resendInvite(v)">
                      <Icon name="lucide:mail" />
                    </button>
                    <button
                      v-if="v.status !== 'banned'"
                      class="icon-btn-sm icon-btn-danger"
                      :aria-label="`Ban ${v.name}`"
                      title="Ban"
                      @click="setBanned(v, true)"
                    >
                      <Icon name="lucide:ban" />
                    </button>
                    <button
                      v-else
                      class="icon-btn-sm icon-btn-brand"
                      :aria-label="`Restore ${v.name}`"
                      title="Restore"
                      @click="setBanned(v, false)"
                    >
                      <Icon name="lucide:rotate-ccw" />
                    </button>
                    <button class="icon-btn-sm icon-btn-danger" :aria-label="`Remove ${v.name}`" title="Remove" @click="remove(v.id, v.name)">
                      <Icon name="lucide:trash-2" />
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="!volunteers?.length">
                <td colspan="5" class="!p-0">
                  <AdminEmptyState
                    icon="lucide:scan-line"
                    title="No volunteers yet"
                    body="Create an account for each person working a booth so they can scan participant QR codes."
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </AdminPanel>

      <!-- add form -->
      <AdminPanel v-if="editing" title="Edit volunteer" icon="lucide:pencil" class="fade-up h-fit">
        <div class="space-y-4">
          <div>
            <label class="label" for="ev-name">Name</label>
            <input id="ev-name" v-model="editing.name" class="input" maxlength="150" />
          </div>
          <div>
            <label class="label" for="ev-email">Email</label>
            <input id="ev-email" v-model="editing.email" type="email" class="input" maxlength="254" />
          </div>
          <p v-if="error" class="form-error" role="alert">{{ error }}</p>
          <div class="flex gap-2">
            <button type="button" class="btn-primary !py-2 text-sm" :disabled="savingEdit" @click="saveEdit">
              <Icon :name="savingEdit ? 'lucide:loader-2' : 'lucide:check'" :class="{ 'animate-spin': savingEdit }" />
              {{ savingEdit ? 'Saving…' : 'Save changes' }}
            </button>
            <button type="button" class="btn-secondary !py-2 text-sm" :disabled="savingEdit" @click="editing = null">Cancel</button>
          </div>
          <p class="text-xs text-ink-faint">
            To reset their password, use the mail icon in the table to send a fresh invitation.
          </p>
        </div>
      </AdminPanel>

      <AdminPanel v-else title="Invite volunteer" icon="lucide:user-plus" class="fade-up stagger-2 h-fit">
        <form class="space-y-4" @submit.prevent="add">
          <div>
            <label class="label" for="vol-name">Name</label>
            <input id="vol-name" v-model="form.name" class="input" maxlength="150" required autocomplete="off" />
          </div>
          <div>
            <label class="label" for="vol-email">Email</label>
            <input id="vol-email" v-model="form.email" type="email" class="input" maxlength="254" required autocomplete="off" />
          </div>
          <p v-if="error" class="form-error" role="alert">{{ error }}</p>

          <button type="submit" class="btn-primary w-full" :disabled="adding">
            <Icon v-if="adding" name="lucide:loader-2" class="animate-spin" />
            {{ adding ? 'Sending…' : 'Send invitation' }}
          </button>
        </form>

        <p class="mt-4 flex items-start gap-2 rounded-xl bg-mist-1 p-3 text-xs leading-relaxed text-ink-soft">
          <Icon name="lucide:info" class="mt-0.5 shrink-0 text-brand-700" />
          They receive an email and choose their own password. Until they do, the account shows as
          <strong>Invited</strong> and cannot sign in. Volunteers only ever reach the scanner.
        </p>
      </AdminPanel>
    </div>

    <!-- assignment editor -->
    <Transition name="dlg">
      <div
        v-if="assigning"
        class="fixed inset-0 z-[110] flex items-end justify-center bg-ink/45 p-4 backdrop-blur-sm sm:items-center"
        @click.self="assigning = null"
      >
        <div class="dialog-panel !max-w-2xl" role="dialog" aria-modal="true" aria-labelledby="assign-title">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 id="assign-title" class="text-base font-bold text-ink">Assign {{ assigning.name }}</h2>
              <p class="mt-1 text-sm text-ink-soft">
                They will only see check-in points for these competitions, plus any event-wide desks.
              </p>
            </div>
            <button class="icon-btn-sm" aria-label="Close" @click="assigning = null"><Icon name="lucide:x" /></button>
          </div>

          <div class="mt-5 max-h-[55vh] space-y-5 overflow-y-auto">
            <AdminCompetitionAssigner v-model="assigned" :tree="tree ?? []" single-event />

            <div>
              <p class="console-label mb-2">Check-in points they staff</p>
              <div v-if="staffableCheckpoints.length" class="grid gap-1.5 sm:grid-cols-2">
                <label
                  v-for="cp in staffableCheckpoints"
                  :key="cp.id"
                  class="flex min-h-[2.5rem] cursor-pointer items-center gap-2.5 rounded-xl border border-line px-3 py-2 text-sm transition-colors"
                  :class="staffedPoints.includes(cp.id) ? 'border-brand-300 bg-brand-50 font-semibold text-brand-800' : 'text-ink-soft hover:bg-mist-1'"
                >
                  <input
                    type="checkbox"
                    class="h-4 w-4 shrink-0 accent-brand-700"
                    :checked="staffedPoints.includes(cp.id)"
                    @change="togglePoint(cp.id)"
                  />
                  <span class="min-w-0 truncate">
                    {{ cp.name }}
                    <span v-if="cp.location" class="font-normal text-ink-faint">· {{ cp.location }}</span>
                    <span v-if="cp.competitionId === null" class="font-normal text-ink-faint">· event-wide</span>
                  </span>
                </label>
              </div>
              <p v-else class="rounded-xl border border-dashed border-line px-4 py-4 text-center text-xs text-ink-faint">
                Pick competitions first — only their desks and event-wide desks can be staffed.
              </p>
            </div>
          </div>

          <div class="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
            <button type="button" class="btn-ghost sm:min-w-[7rem]" @click="assigning = null">Cancel</button>
            <button type="button" class="btn-primary !py-2.5 sm:min-w-[9rem]" :disabled="savingAssign" @click="saveAssignments">
              <Icon :name="savingAssign ? 'lucide:loader-2' : 'lucide:check'" :class="{ 'animate-spin': savingAssign }" />
              {{ savingAssign ? 'Saving…' : 'Save assignment' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
