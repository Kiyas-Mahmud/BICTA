<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const { data: volunteers, refresh } = await useFetch<{ id: number; name: string; email: string }[]>('/api/admin/volunteers')

const form = reactive({ name: '', email: '', password: '' })
const adding = ref(false)
const error = ref('')
const toast = useToast()
const { confirm } = useConfirm()

async function add() {
  error.value = ''
  adding.value = true
  try {
    await $fetch('/api/admin/volunteers', { method: 'POST', body: { ...form } })
    toast.success(`${form.name || 'Volunteer'} can now sign in`, 'Share the password with them — it is not shown again.')
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
  const ok = await confirm({
    title: `Remove ${name}?`,
    body: 'They lose access to the scanner immediately. Check-ins they already recorded are kept.',
    confirmLabel: 'Remove volunteer',
  })
  if (!ok) return
  await $fetch(`/api/admin/volunteers/${id}`, { method: 'DELETE' })
  await refresh()
  toast.success(`${name} removed`)
}

// Readable throwaway password so nobody invents "123456" on event morning.
function suggestPassword() {
  const words = ['sage', 'scan', 'booth', 'kit', 'team', 'gate', 'badge', 'crew']
  const pick = () => words[Math.floor(Math.random() * words.length)]
  form.password = `${pick()}-${pick()}-${Math.floor(1000 + Math.random() * 9000)}`
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
                <th scope="col">Email</th>
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
                <td class="text-ink-soft">{{ v.email }}</td>
                <td>
                  <div class="row-actions">
                    <button class="icon-btn-sm icon-btn-brand" :aria-label="`Copy ${v.name}'s email`" title="Copy email" @click="copyEmail(v.email)">
                      <Icon name="lucide:copy" />
                    </button>
                    <button class="icon-btn-sm icon-btn-danger" :aria-label="`Remove ${v.name}`" title="Remove" @click="remove(v.id, v.name)">
                      <Icon name="lucide:trash-2" />
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="!volunteers?.length">
                <td colspan="3" class="!p-0">
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
      <AdminPanel title="Add volunteer" icon="lucide:user-plus" class="fade-up stagger-2 h-fit">
        <form class="space-y-4" @submit.prevent="add">
          <div>
            <label class="label" for="vol-name">Name</label>
            <input id="vol-name" v-model="form.name" class="input" maxlength="150" required autocomplete="off" />
          </div>
          <div>
            <label class="label" for="vol-email">Email</label>
            <input id="vol-email" v-model="form.email" type="email" class="input" maxlength="254" required autocomplete="off" />
          </div>
          <div>
            <div class="flex items-baseline justify-between gap-2">
              <label class="label" for="vol-pass">Password <span class="font-normal text-ink-faint">(min 8)</span></label>
              <button type="button" class="text-xs font-bold text-brand-700 transition-colors hover:text-brand-800" @click="suggestPassword">
                Suggest
              </button>
            </div>
            <input id="vol-pass" v-model="form.password" type="text" class="input font-mono" minlength="8" required placeholder="Share this with them" autocomplete="off" />
            <p class="mt-1.5 text-xs text-ink-faint">Shown once here — copy it before saving.</p>
          </div>

          <p v-if="error" class="form-error" role="alert">{{ error }}</p>

          <button type="submit" class="btn-primary w-full" :disabled="adding">
            <Icon v-if="adding" name="lucide:loader-2" class="animate-spin" />
            {{ adding ? 'Adding…' : 'Add volunteer' }}
          </button>
        </form>

        <p class="mt-4 flex items-start gap-2 rounded-xl bg-mist-1 p-3 text-xs leading-relaxed text-ink-soft">
          <Icon name="lucide:info" class="mt-0.5 shrink-0 text-brand-700" />
          Volunteers can only reach the scanner. Everything else in this console stays admin-only.
        </p>
      </AdminPanel>
    </div>
  </div>
</template>
