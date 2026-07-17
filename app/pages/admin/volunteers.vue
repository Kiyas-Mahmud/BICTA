<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const { data: volunteers, refresh } = await useFetch<{ id: number; name: string; email: string }[]>('/api/admin/volunteers')

const form = reactive({ name: '', email: '', password: '' })
const adding = ref(false)
const error = ref('')

async function add() {
  error.value = ''
  adding.value = true
  try {
    await $fetch('/api/admin/volunteers', { method: 'POST', body: { ...form } })
    form.name = ''
    form.email = ''
    form.password = ''
    await refresh()
  } catch (e: any) {
    error.value = e?.data?.statusMessage ?? 'Could not create volunteer.'
  } finally {
    adding.value = false
  }
}

async function remove(id: number, name: string) {
  if (!window.confirm(`Remove volunteer ${name}?`)) return
  await $fetch(`/api/admin/volunteers/${id}`, { method: 'DELETE' })
  await refresh()
}

function initials(name: string) {
  return (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
}
</script>

<template>
  <div>
    <div class="admin-head">
      <div>
        <h1 class="admin-h1">Scanner Volunteers</h1>
        <p class="admin-sub">Event-day staff who log in at <code class="rounded bg-mist-2 px-1.5 py-0.5 text-xs">/admin/login</code> and land on the QR scanner — scan only, no admin access.</p>
      </div>
    </div>

    <div class="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
      <!-- list -->
      <div class="overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
        <div class="overflow-x-auto">
          <table class="admin-table min-w-[420px]">
            <thead>
              <tr>
                <th>Volunteer</th>
                <th>Email</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="v in volunteers" :key="v.id">
                <td>
                  <div class="flex items-center gap-3">
                    <span class="avatar-chip">{{ initials(v.name) }}</span>
                    <span class="font-semibold text-ink">{{ v.name }}</span>
                  </div>
                </td>
                <td class="text-ink-soft">{{ v.email }}</td>
                <td>
                  <div class="flex justify-end">
                    <button class="icon-btn hover:bg-red-50 hover:text-red-600" aria-label="Remove" @click="remove(v.id, v.name)"><Icon name="lucide:trash-2" /></button>
                  </div>
                </td>
              </tr>
              <tr v-if="!volunteers?.length">
                <td colspan="3" class="px-5 py-12 text-center">
                  <div class="flex flex-col items-center gap-2 text-ink-faint">
                    <Icon name="lucide:scan-line" class="text-3xl" />
                    <p class="text-sm">No volunteers yet.</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- add form -->
      <div class="admin-panel h-fit">
        <div class="mb-4 flex items-center gap-2.5">
          <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100 text-brand-700"><Icon name="lucide:user-plus" /></span>
          <h2 class="text-sm font-bold text-ink">Add volunteer</h2>
        </div>
        <div class="space-y-3">
          <div>
            <label class="label">Name</label>
            <input v-model="form.name" class="input" maxlength="150" />
          </div>
          <div>
            <label class="label">Email</label>
            <input v-model="form.email" type="email" class="input" maxlength="254" />
          </div>
          <div>
            <label class="label">Password <span class="font-normal text-ink-faint">(min 8)</span></label>
            <input v-model="form.password" type="text" class="input" minlength="8" placeholder="Share this with them" />
          </div>
          <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
          <button class="btn-primary w-full" :disabled="adding" @click="add">
            <Icon v-if="adding" name="lucide:loader-2" class="animate-spin" />
            {{ adding ? 'Adding…' : 'Add volunteer' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
