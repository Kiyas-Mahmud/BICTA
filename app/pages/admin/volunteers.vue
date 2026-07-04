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
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold tracking-tight">Scanner Volunteers</h1>
    <p class="mt-1 text-sm text-ink-soft">
      Volunteers log in at <code class="rounded bg-neutral-100 px-1">/admin/login</code> and land straight on the QR scanner — they can only mark collections, not touch admin content.
    </p>

    <div class="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
      <!-- list -->
      <div class="overflow-hidden rounded-xl border border-line bg-white">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-line bg-neutral-50 text-xs uppercase text-ink-soft">
            <tr>
              <th class="px-4 py-3">Name</th>
              <th class="px-4 py-3">Email</th>
              <th class="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="v in volunteers" :key="v.id" class="border-b border-line transition-colors last:border-0 hover:bg-neutral-50">
              <td class="px-4 py-3 font-medium">{{ v.name }}</td>
              <td class="px-4 py-3 text-ink-soft">{{ v.email }}</td>
              <td class="px-4 py-3 text-right">
                <button class="font-medium text-red-600 hover:underline" @click="remove(v.id, v.name)">Remove</button>
              </td>
            </tr>
            <tr v-if="!volunteers?.length">
              <td colspan="3" class="px-4 py-10 text-center text-ink-faint">No volunteers yet.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- add form -->
      <div class="admin-card p-5">
        <h2 class="text-sm font-bold">Add volunteer</h2>
        <div class="mt-4 space-y-3">
          <div>
            <label class="label">Name</label>
            <input v-model="form.name" class="input" maxlength="150" />
          </div>
          <div>
            <label class="label">Email</label>
            <input v-model="form.email" type="email" class="input" maxlength="254" />
          </div>
          <div>
            <label class="label">Password (min 8)</label>
            <input v-model="form.password" type="text" class="input" minlength="8" placeholder="Share this with them" />
          </div>
          <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
          <button class="btn-primary w-full" :disabled="adding" @click="add">
            {{ adding ? 'Adding…' : 'Add volunteer' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
