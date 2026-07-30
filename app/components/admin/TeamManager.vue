<script setup lang="ts">
// Live roster editor for one registration, embedded in the admin registrations
// list's expanded row. Unlike the participant-facing dashboard, every action
// here works regardless of the registration deadline — that override is the
// whole point of this panel existing.
const props = defineProps<{ registrationId: number }>()
const emit = defineEmits<{ changed: [] }>()

interface Member {
  memberId: number
  accountId: number
  role: 'leader' | 'member'
  fullName: string
  email: string
  status: 'invited' | 'pending' | 'active'
}
interface TeamData {
  registrationId: number
  teamName: string | null
  maxTeamSize: number
  deadlinePassed: boolean
  roster: Member[]
}

const { data, refresh, pending } = await useFetch<TeamData>(`/api/admin/registrations/${props.registrationId}/team`)
const toast = useToast()
const { confirm } = useConfirm()
const busy = ref(false)

const newMember = reactive({ name: '', email: '' })

function statusBadge(status: Member['status']) {
  if (status === 'active') return 'badge badge-green'
  if (status === 'pending') return 'badge badge-blue'
  return 'badge badge-amber'
}
function statusLabel(status: Member['status']) {
  if (status === 'active') return 'Active'
  if (status === 'pending') return 'Unverified'
  return 'Invited'
}

async function reassign(m: Member) {
  const ok = await confirm({
    title: `Make ${m.fullName} the team leader?`,
    body: `${data.value?.roster.find((r) => r.role === 'leader')?.fullName ?? 'The current leader'} becomes a regular member. This works even after the registration deadline.`,
    confirmLabel: 'Reassign leader',
  })
  if (!ok) return
  busy.value = true
  try {
    await $fetch(`/api/admin/registrations/${props.registrationId}/team/reassign-leader`, {
      method: 'POST',
      body: { accountId: m.accountId },
    })
    await refresh()
    emit('changed')
    toast.success(`${m.fullName} is now the team leader`)
  } catch (e: any) {
    toast.error('Could not reassign leader', e?.data?.statusMessage ?? 'Try again in a moment.')
  } finally {
    busy.value = false
  }
}

async function remove(m: Member) {
  const ok = await confirm({
    title: `Remove ${m.fullName} from the team?`,
    body: 'This cannot be undone from here. They can be re-added afterward if needed.',
    confirmLabel: 'Remove member',
  })
  if (!ok) return
  busy.value = true
  try {
    await $fetch(`/api/admin/registrations/${props.registrationId}/team/members/${m.memberId}`, { method: 'DELETE' })
    await refresh()
    emit('changed')
    toast.success(`${m.fullName} removed`)
  } catch (e: any) {
    toast.error('Could not remove member', e?.data?.statusMessage ?? 'Try again in a moment.')
  } finally {
    busy.value = false
  }
}

async function addMember() {
  if (!newMember.name || !newMember.email) return
  busy.value = true
  try {
    await $fetch(`/api/admin/registrations/${props.registrationId}/team/members`, {
      method: 'POST',
      body: { name: newMember.name, email: newMember.email },
    })
    newMember.name = ''
    newMember.email = ''
    await refresh()
    emit('changed')
    toast.success('Team member added', 'They will receive an email invite.')
  } catch (e: any) {
    toast.error('Could not add that member', e?.data?.statusMessage ?? 'Check the details and try again.')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="rounded-xl border border-line bg-white p-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <p class="console-label">Manage team</p>
      <span v-if="data?.deadlinePassed" class="status status-warn">
        <Icon name="lucide:unlock" /> Deadline passed — admin edits still work
      </span>
    </div>

    <p v-if="pending" class="mt-3 text-sm text-ink-faint">Loading roster…</p>

    <ul v-else class="mt-3 space-y-2">
      <li
        v-for="m in data?.roster ?? []"
        :key="m.memberId"
        class="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-mist-1 px-3 py-2"
      >
        <div class="min-w-0">
          <p class="truncate text-sm font-semibold text-ink">
            {{ m.fullName }}
            <span v-if="m.role === 'leader'" class="badge badge-blue ml-1">Leader</span>
          </p>
          <p class="truncate text-xs text-ink-faint">{{ m.email }}</p>
        </div>
        <div class="flex shrink-0 items-center gap-1.5">
          <span :class="statusBadge(m.status)">{{ statusLabel(m.status) }}</span>
          <button
            v-if="m.role !== 'leader'"
            type="button"
            class="icon-btn-sm icon-btn-brand"
            :disabled="busy"
            :aria-label="`Make ${m.fullName} leader`"
            title="Make team leader"
            @click="reassign(m)"
          >
            <Icon name="lucide:crown" />
          </button>
          <button
            v-if="m.role !== 'leader'"
            type="button"
            class="icon-btn-sm icon-btn-danger"
            :disabled="busy"
            :aria-label="`Remove ${m.fullName}`"
            title="Remove from team"
            @click="remove(m)"
          >
            <Icon name="lucide:trash-2" />
          </button>
        </div>
      </li>
    </ul>

    <div v-if="data && data.roster.length < data.maxTeamSize" class="mt-3 flex flex-col gap-2 sm:flex-row">
      <input v-model="newMember.name" class="field sm:flex-1" placeholder="Full name" maxlength="150" />
      <input v-model="newMember.email" type="email" class="field sm:flex-1" placeholder="Email" maxlength="254" />
      <button type="button" class="btn-secondary shrink-0 justify-center" :disabled="busy" @click="addMember">
        <Icon name="lucide:user-plus" /> Add
      </button>
    </div>
  </div>
</template>
