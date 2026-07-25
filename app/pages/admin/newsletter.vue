<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const { data: subs, refresh } = await useFetch<{ id: number; email: string; createdAt: string }[]>('/api/admin/newsletter')
const toast = useToast()
const { confirm } = useConfirm()

const search = ref('')
const visible = computed(() => {
  const q = search.value.trim().toLowerCase()
  return (subs.value ?? []).filter((s) => !q || s.email.toLowerCase().includes(q))
})

// Subscribers added in the last 30 days — the number people actually ask about.
const recent = computed(() => {
  const cutoff = Date.now() - 30 * 86400_000
  return (subs.value ?? []).filter((s) => parseUtc(s.createdAt).getTime() > cutoff).length
})

async function remove(id: number, email: string) {
  const ok = await confirm({
    title: 'Remove subscriber?',
    body: `${email} stops receiving the newsletter. They can subscribe again from the public site.`,
    confirmLabel: 'Remove',
  })
  if (!ok) return
  await $fetch(`/api/admin/newsletter/${id}`, { method: 'DELETE' })
  await refresh()
  toast.success('Subscriber removed')
}

async function copyAll() {
  try {
    await navigator.clipboard.writeText(visible.value.map((s) => s.email).join(', '))
    toast.info(`${visible.value.length} addresses copied`)
  } catch {
    toast.error('Could not copy addresses')
  }
}
</script>

<template>
  <div class="space-y-6">
    <AdminPageHeader title="Newsletter subscribers" subtitle="People who signed up from the public site." icon="lucide:mail">
      <template #actions>
        <button class="btn-ghost" :disabled="!visible.length" @click="copyAll">
          <Icon name="lucide:copy" /> Copy addresses
        </button>
        <a href="/api/admin/newsletter/export" class="btn-secondary !py-2.5" download>
          <Icon name="lucide:download" /> Export CSV
        </a>
      </template>
    </AdminPageHeader>

    <div class="fade-up stagger-1 grid grid-cols-2 gap-3 sm:max-w-md">
      <div class="surface p-4">
        <p class="console-label">Total</p>
        <p class="mt-1 text-2xl font-extrabold tabular-nums leading-none text-ink">{{ subs?.length ?? 0 }}</p>
      </div>
      <div class="surface p-4">
        <p class="console-label">Last 30 days</p>
        <p class="mt-1 text-2xl font-extrabold tabular-nums leading-none text-ink">{{ recent }}</p>
      </div>
    </div>

    <div v-if="subs?.length" class="toolbar fade-up stagger-2">
      <div class="relative min-w-[12rem] flex-1 sm:max-w-sm">
        <Icon name="lucide:search" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
        <label class="sr-only" for="sub-search">Search subscribers</label>
        <input id="sub-search" v-model="search" type="search" class="input !pl-9" placeholder="Search email" />
      </div>
      <span class="ml-auto text-xs font-semibold text-ink-faint">{{ visible.length }} shown</span>
    </div>

    <section class="surface fade-up stagger-3 overflow-hidden">
      <div class="table-wrap">
        <table class="console-table min-w-[24rem]">
          <thead>
            <tr>
              <th scope="col">Email</th>
              <th scope="col">Subscribed</th>
              <th scope="col" class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="sub in visible" :key="sub.id">
              <td>
                <div class="flex items-center gap-3">
                  <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100">
                    <Icon name="lucide:mail" />
                  </span>
                  <span class="truncate font-semibold text-ink">{{ sub.email }}</span>
                </div>
              </td>
              <td class="whitespace-nowrap text-ink-soft">{{ formatDay(sub.createdAt) }}</td>
              <td>
                <div class="row-actions">
                  <button class="icon-btn-sm icon-btn-danger" :aria-label="`Remove ${sub.email}`" title="Remove" @click="remove(sub.id, sub.email)">
                    <Icon name="lucide:trash-2" />
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!visible.length">
              <td colspan="3" class="!p-0">
                <AdminEmptyState
                  icon="lucide:mail"
                  :title="subs?.length ? 'No matching addresses' : 'No subscribers yet'"
                  :body="subs?.length ? 'Try a different search term.' : 'Sign-ups from the newsletter section on the home page appear here.'"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
