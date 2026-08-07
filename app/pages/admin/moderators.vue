<script setup lang="ts">
// Main-admin-only screen. The middleware keeps moderators off the route and
// every endpoint behind it calls requireMainAdmin, so the guard does not rely
// on the nav simply hiding the link.
definePageMeta({ layout: 'admin', middleware: ['admin', 'main-admin'] })

interface Moderator {
  id: number
  name: string
  email: string
  createdAt: string | null
}

const { data: moderators, refresh } = await useFetch<Moderator[]>('/api/admin/moderators')
const toast = useToast()
const { confirm } = useConfirm()

// One form serves both create and edit; `editing` holds the row being changed,
// or null when adding. On edit an empty password means "leave it alone".
const editing = ref<Moderator | null>(null)
const open = ref(false)
const form = reactive({ name: '', email: '', password: '' })
const saving = ref(false)
const error = ref('')

function startAdd() {
  editing.value = null
  Object.assign(form, { name: '', email: '', password: '' })
  error.value = ''
  open.value = true
}
function startEdit(m: Moderator) {
  editing.value = m
  Object.assign(form, { name: m.name, email: m.email, password: '' })
  error.value = ''
  open.value = true
}
function close() {
  open.value = false
  editing.value = null
}

async function save() {
  error.value = ''
  if (!form.name.trim() || !form.email.trim()) {
    error.value = 'Name and email are both required.'
    return
  }
  if (!editing.value && form.password.length < 8) {
    error.value = 'Set a password of at least 8 characters.'
    return
  }
  if (editing.value && form.password && form.password.length < 8) {
    error.value = 'The new password needs at least 8 characters.'
    return
  }

  saving.value = true
  try {
    if (editing.value) {
      await $fetch(`/api/admin/moderators/${editing.value.id}`, {
        method: 'PUT',
        body: { name: form.name, email: form.email, password: form.password || undefined },
      })
      toast.success(form.password ? 'Moderator updated and password reset' : 'Moderator updated')
    } else {
      await $fetch('/api/admin/moderators', { method: 'POST', body: { ...form } })
      toast.success('Moderator added', `${form.name} can sign in with that email and password.`)
    }
    close()
    await refresh()
  } catch (e: any) {
    error.value = e?.data?.statusMessage ?? 'Could not save. Try again.'
  } finally {
    saving.value = false
  }
}

async function remove(m: Moderator) {
  const ok = await confirm({
    title: `Remove ${m.name}?`,
    body: 'They lose console access immediately. Their entries in the activity log are kept.',
    confirmLabel: 'Remove moderator',
    tone: 'danger',
  })
  if (!ok) return
  try {
    await $fetch(`/api/admin/moderators/${m.id}`, { method: 'DELETE' })
    await refresh()
    toast.success('Moderator removed')
  } catch (e: any) {
    toast.error('Could not remove', e?.data?.statusMessage ?? 'Try again in a moment.')
  }
}

useSeoMeta({ title: 'Moderators', robots: 'noindex' })
</script>

<template>
  <div class="space-y-6">
    <AdminPageHeader
      title="Moderators"
      subtitle="Console accounts that manage content but never reach site settings, this page, or the activity log."
      icon="lucide:user-cog"
    >
      <template #badge>
        <span class="status status-neutral">Main admin only</span>
      </template>
      <template #actions>
        <button type="button" class="btn-primary !py-2 text-sm" @click="startAdd">
          <Icon name="lucide:plus" /> Add moderator
        </button>
      </template>
    </AdminPageHeader>

    <AdminPanel
      v-if="open"
      :title="editing ? `Edit ${editing.name}` : 'New moderator'"
      :subtitle="editing ? 'Leave the password blank to keep the current one.' : 'They sign in at /login with this email and password.'"
      icon="lucide:shield"
      class="fade-up"
    >
      <div class="grid max-w-3xl gap-4 sm:grid-cols-2">
        <div>
          <label class="label" for="m-name">Full name</label>
          <input id="m-name" v-model="form.name" class="input" maxlength="150" placeholder="e.g. Samaun Iqbal" />
        </div>
        <div>
          <label class="label" for="m-email">Email</label>
          <input id="m-email" v-model="form.email" type="email" class="input" maxlength="254" placeholder="name@example.com" />
        </div>
        <div class="sm:col-span-2">
          <label class="label" for="m-pass">{{ editing ? 'New password' : 'Password' }}</label>
          <input
            id="m-pass"
            v-model="form.password"
            type="password"
            class="input"
            autocomplete="new-password"
            :placeholder="editing ? 'Leave blank to keep the current password' : 'At least 8 characters'"
          />
        </div>
      </div>

      <p v-if="error" class="form-error mt-3">{{ error }}</p>

      <div class="mt-4 flex items-center gap-2">
        <button type="button" class="btn-primary !py-2 text-sm" :disabled="saving" @click="save">
          <Icon :name="saving ? 'lucide:loader-2' : 'lucide:check'" :class="{ 'animate-spin': saving }" />
          {{ saving ? 'Saving…' : editing ? 'Save changes' : 'Add moderator' }}
        </button>
        <button type="button" class="btn-secondary !py-2 text-sm" :disabled="saving" @click="close">Cancel</button>
      </div>
    </AdminPanel>

    <AdminPanel title="Current moderators" icon="lucide:users" class="fade-up stagger-1">
      <ul v-if="moderators?.length" class="space-y-2">
        <li
          v-for="m in moderators"
          :key="m.id"
          class="flex items-center gap-3 rounded-xl border border-line bg-white p-3 sm:px-4"
        >
          <AdminAvatar :name="m.name" />
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-bold text-ink">{{ m.name }}</p>
            <p class="truncate text-xs text-ink-faint">{{ m.email }}</p>
          </div>
          <span class="badge badge-blue hidden sm:inline-flex">Moderator</span>
          <div class="flex shrink-0 items-center gap-1">
            <button type="button" class="icon-btn-sm icon-btn-brand" aria-label="Edit moderator" @click="startEdit(m)">
              <Icon name="lucide:pencil" />
            </button>
            <button type="button" class="icon-btn-sm icon-btn-danger" aria-label="Remove moderator" @click="remove(m)">
              <Icon name="lucide:trash-2" />
            </button>
          </div>
        </li>
      </ul>

      <AdminEmptyState
        v-else
        icon="lucide:user-cog"
        title="No moderators yet"
        body="Add one to share the day-to-day work — reviewing applications, managing events and judges — without handing over site settings."
      />
    </AdminPanel>
  </div>
</template>
