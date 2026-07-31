<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

interface Person {
  id: number
  name: string
  title: string
  organization: string
  photoUrl: string | null
  bio: string
  role: 'judge' | 'speaker'
  socialUrl: string | null
  email: string
  phone: string
  expertise: string
  sortOrder: number
  // null for speakers (no login concept) and for judges never invited.
  judgeStatus: 'invited' | 'active' | null
}

// People are reusable across editions, so filtering by event means "assigned to
// judge something in that event". "All events" also covers speakers, who have
// no competition assignment at all.
const { eventOptions, eventId, query, activeEvent } = useEventFilter({ allowAll: true })
const { data: people, refresh } = await useFetch<Person[]>('/api/admin/people', { query })
const { data: tree } = await useFetch('/api/admin/event-tree', { key: 'admin-event-tree' })

const toast = useToast()
const { confirm } = useConfirm()

const editing = ref<Partial<Person> | null>(null)
const isNew = ref(false)
const saving = ref(false)
const error = ref('')
// Assignments live in their own table, so they are edited alongside the row
// but saved through their own endpoint.
const assigned = ref<number[]>([])

function blank(): Partial<Person> {
  return {
    name: '', title: '', organization: '', photoUrl: null, bio: '',
    role: 'judge', socialUrl: '', email: '', phone: '', expertise: '',
    sortOrder: (people.value?.length ?? 0) + 1,
  }
}

async function startNew() {
  editing.value = blank()
  assigned.value = []
  isNew.value = true
  error.value = ''
}

async function startEdit(p: Person) {
  editing.value = { ...p }
  isNew.value = false
  error.value = ''
  assigned.value = []
  try {
    const res = await $fetch<{ competitionIds: number[] }>(`/api/admin/people/${p.id}/competitions`)
    assigned.value = res.competitionIds
  } catch {
    // Assignment list is additive; failing to load it must not block editing.
  }
}

async function save() {
  if (!editing.value) return
  saving.value = true
  error.value = ''
  try {
    const saved = isNew.value
      ? await $fetch<Person>('/api/admin/people', { method: 'POST', body: editing.value })
      : await $fetch<Person>(`/api/admin/people/${editing.value.id}`, { method: 'PUT', body: editing.value })

    if (saved.role === 'judge') {
      await $fetch(`/api/admin/people/${saved.id}/competitions`, {
        method: 'PUT',
        body: { competitionIds: assigned.value },
      })
    }
    toast.success(isNew.value ? 'Person added' : 'Changes saved')
    editing.value = null
    await Promise.all([refresh(), refreshAdminStats()])
  } catch (e: any) {
    error.value = e?.data?.statusMessage ?? 'Save failed. Check the fields.'
  } finally {
    saving.value = false
  }
}

async function remove(p: Person) {
  const ok = await confirm({ title: `Delete ${p.name}?`, body: 'They are removed from the public site and from any competition assignments.' })
  if (!ok) return
  await $fetch(`/api/admin/people/${p.id}`, { method: 'DELETE' })
  if (editing.value?.id === p.id) editing.value = null
  await Promise.all([refresh(), refreshAdminStats()])
  toast.success('Removed')
}

// Judge portal invites — a small dedicated dialog, not useConfirm() (yes/no
// only, no input slot).
const inviteTarget = ref<Person | null>(null)
const inviteSending = ref(false)
const inviteError = ref('')

function openInvite(p: Person) {
  inviteTarget.value = p
  inviteError.value = ''
}
async function sendInvite(email: string) {
  if (!inviteTarget.value) return
  inviteSending.value = true
  inviteError.value = ''
  try {
    await $fetch(`/api/admin/people/${inviteTarget.value.id}/judge-invite`, { method: 'POST', body: { email } })
    toast.success(inviteTarget.value.judgeStatus === 'invited' ? 'Invite resent' : 'Invite sent')
    inviteTarget.value = null
    await refresh()
  } catch (e: any) {
    inviteError.value = e?.data?.statusMessage ?? 'Could not send the invite.'
  } finally {
    inviteSending.value = false
  }
}

const roleFilter = ref('all')
const filtered = computed(() =>
  (people.value ?? []).filter((p) => roleFilter.value === 'all' || p.role === roleFilter.value),
)
const roleOptions = computed(() => [
  { value: 'all', label: 'All', count: people.value?.length ?? 0 },
  { value: 'judge', label: 'Judges', count: people.value?.filter((p) => p.role === 'judge').length ?? 0 },
  { value: 'speaker', label: 'Speakers', count: people.value?.filter((p) => p.role === 'speaker').length ?? 0 },
])
</script>

<template>
  <div class="space-y-6">
    <AdminPageHeader
      title="Judges & Speakers"
      :subtitle="activeEvent ? `Judging on ${activeEvent.title}.` : 'People featured on the public site. Judges can be assigned to the competitions they score.'"
      icon="lucide:users"
    >
      <template #actions>
        <button class="btn-primary !py-2.5" @click="startNew"><Icon name="lucide:plus" /> New person</button>
      </template>
    </AdminPageHeader>

    <AdminEventFilter
      v-model="eventId"
      :options="eventOptions"
      hint="Filters to judges assigned to that edition. Speakers appear under All events."
    />

    <!-- editor -->
    <Transition
      enter-active-class="transition duration-200 ease-out" enter-from-class="-translate-y-2 opacity-0"
      leave-active-class="transition duration-150 ease-in" leave-to-class="-translate-y-2 opacity-0"
    >
      <section v-if="editing" class="surface-raised overflow-hidden">
        <div class="panel-head">
          <div class="flex items-center gap-3">
            <span class="panel-glyph"><Icon :name="isNew ? 'lucide:plus' : 'lucide:pencil'" /></span>
            <h2 class="console-h2">{{ isNew ? 'Add person' : `Edit ${editing.name}` }}</h2>
          </div>
          <button class="icon-btn-sm" aria-label="Close editor" @click="editing = null"><Icon name="lucide:x" /></button>
        </div>

        <form class="panel-body space-y-6" @submit.prevent="save">
          <AdminFormSection title="Identity" description="Shown on the public site." icon="lucide:id-card">
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="label" for="p-name">Name <span class="text-red-600">*</span></label>
                <input id="p-name" v-model="editing.name" class="input" required maxlength="150" />
              </div>
              <div>
                <label class="label" for="p-role">Role</label>
                <select id="p-role" v-model="editing.role" class="input">
                  <option value="judge">Judge</option>
                  <option value="speaker">Speaker</option>
                </select>
              </div>
              <div>
                <label class="label" for="p-title">Title</label>
                <input id="p-title" v-model="editing.title" class="input" maxlength="150" placeholder="Head of Engineering" />
              </div>
              <div>
                <label class="label" for="p-org">Organization</label>
                <input id="p-org" v-model="editing.organization" class="input" maxlength="150" />
              </div>
            </div>
          </AdminFormSection>

          <AdminFormSection title="Contact" description="Internal only, never shown publicly." icon="lucide:mail">
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="label" for="p-email">Email</label>
                <input id="p-email" v-model="editing.email" type="email" class="input" maxlength="254" />
              </div>
              <div>
                <label class="label" for="p-phone">Phone</label>
                <input id="p-phone" v-model="editing.phone" class="input" maxlength="30" />
              </div>
              <div class="sm:col-span-2">
                <label class="label" for="p-expertise">Expertise</label>
                <input id="p-expertise" v-model="editing.expertise" class="input" maxlength="300" placeholder="Machine learning, distributed systems" />
              </div>
            </div>
          </AdminFormSection>

          <AdminFormSection
            v-if="editing.role === 'judge'"
            title="Assigned competitions"
            description="Judges appear on the pages of the competitions they are assigned to."
            icon="lucide:gavel"
          >
            <AdminCompetitionAssigner v-model="assigned" :tree="tree ?? []" />
          </AdminFormSection>

          <AdminFormSection title="Profile" description="Photo, links and biography." icon="lucide:image">
            <div>
              <label class="label" for="p-social">Profile URL</label>
              <input id="p-social" v-model="editing.socialUrl" class="input" placeholder="https://…" />
            </div>
            <div>
              <label class="label">Photo</label>
              <AdminImageUploader v-model="editing.photoUrl" />
            </div>
            <div>
              <label class="label">Bio</label>
              <AdminRichText v-model="editing.bio" />
            </div>
            <div>
              <label class="label" for="p-sort">Sort order</label>
              <input id="p-sort" v-model.number="editing.sortOrder" type="number" class="input" min="0" max="1000" />
            </div>
          </AdminFormSection>

          <p v-if="error" class="form-error" role="alert">{{ error }}</p>

          <div class="flex flex-wrap gap-3">
            <button type="submit" class="btn-primary !py-2.5" :disabled="saving">
              <Icon :name="saving ? 'lucide:loader-2' : 'lucide:check'" :class="{ 'animate-spin': saving }" />
              {{ saving ? 'Saving…' : 'Save' }}
            </button>
            <button type="button" class="btn-ghost" @click="editing = null">Cancel</button>
          </div>
        </form>
      </section>
    </Transition>

    <div class="toolbar fade-up">
      <AdminSegmented v-model="roleFilter" :options="roleOptions" aria-label="Filter by role" />
    </div>

    <section class="surface fade-up stagger-1 overflow-hidden">
      <div class="table-wrap">
        <table class="console-table min-w-[38rem]">
          <thead>
            <tr>
              <th scope="col">Person</th>
              <th scope="col">Role</th>
              <th scope="col">Organization</th>
              <th scope="col">Expertise</th>
              <th scope="col" class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in filtered" :key="p.id">
              <td>
                <div class="flex items-center gap-3">
                  <AdminAvatar :name="p.name" :src="p.photoUrl" />
                  <div class="min-w-0">
                    <p class="truncate font-semibold text-ink">{{ p.name }}</p>
                    <p class="truncate text-xs text-ink-faint">{{ p.title || p.email || '—' }}</p>
                  </div>
                </div>
              </td>
              <td>
                <div class="flex flex-wrap items-center gap-1.5">
                  <span class="status" :class="p.role === 'judge' ? 'status-brand' : 'status-neutral'">{{ p.role }}</span>
                  <span v-if="p.role === 'judge' && p.judgeStatus === 'active'" class="status status-ok" title="Has an active judge portal login">Active</span>
                  <span v-else-if="p.role === 'judge' && p.judgeStatus === 'invited'" class="status status-warn" title="Invited, has not set a password yet">Invited</span>
                </div>
              </td>
              <td class="text-ink-soft">{{ p.organization || '—' }}</td>
              <td class="text-ink-soft">{{ p.expertise || '—' }}</td>
              <td>
                <div class="row-actions">
                  <button
                    v-if="p.role === 'judge' && p.judgeStatus !== 'active'"
                    class="icon-btn-sm icon-btn-brand"
                    :aria-label="`${p.judgeStatus === 'invited' ? 'Resend invite to' : 'Invite'} ${p.name}`"
                    :title="p.judgeStatus === 'invited' ? 'Resend judge portal invite' : 'Invite to judge portal'"
                    @click="openInvite(p)"
                  >
                    <Icon name="lucide:send" />
                  </button>
                  <button class="icon-btn-sm icon-btn-brand" :aria-label="`Edit ${p.name}`" title="Edit" @click="startEdit(p)">
                    <Icon name="lucide:pencil" />
                  </button>
                  <button class="icon-btn-sm icon-btn-danger" :aria-label="`Delete ${p.name}`" title="Delete" @click="remove(p)">
                    <Icon name="lucide:trash-2" />
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!filtered.length">
              <td colspan="5" class="!p-0">
                <AdminEmptyState icon="lucide:users" title="Nobody here yet" body="Add judges and speakers with a photo, short bio and their competition assignments.">
                  <template #action><button class="btn-primary !py-2.5" @click="startNew">Add the first one</button></template>
                </AdminEmptyState>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <AdminJudgeInviteDialog
      :open="Boolean(inviteTarget)"
      :person-name="inviteTarget?.name ?? ''"
      :person-email="inviteTarget?.email ?? ''"
      :judge-status="inviteTarget?.judgeStatus ?? null"
      :sending="inviteSending"
      :error="inviteError"
      @close="inviteTarget = null"
      @send="sendInvite"
    />
  </div>
</template>
