<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const { data: subs, refresh } = await useFetch<{ id: number; email: string; createdAt: string }[]>('/api/admin/newsletter')

async function remove(id: number, email: string) {
  if (!window.confirm(`Remove ${email}?`)) return
  await $fetch(`/api/admin/newsletter/${id}`, { method: 'DELETE' })
  await refresh()
}
</script>

<template>
  <div>
    <div class="admin-head">
      <div>
        <h1 class="admin-h1">Newsletter subscribers</h1>
        <p class="admin-sub"><span class="font-semibold text-ink">{{ subs?.length ?? 0 }}</span> people subscribed from the public site.</p>
      </div>
      <a href="/api/admin/newsletter/export" class="btn-secondary !py-2.5" download><Icon name="lucide:download" /> Export CSV</a>
    </div>

    <div class="mt-6 overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
      <div class="overflow-x-auto">
        <table class="admin-table min-w-[420px]">
          <thead>
            <tr>
              <th>Email</th>
              <th>Subscribed</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="sub in subs" :key="sub.id">
              <td>
                <div class="flex items-center gap-3">
                  <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700"><Icon name="lucide:mail" /></span>
                  <span class="font-semibold text-ink">{{ sub.email }}</span>
                </div>
              </td>
              <td class="text-ink-soft">{{ new Date(sub.createdAt + 'Z').toLocaleDateString() }}</td>
              <td>
                <div class="flex justify-end">
                  <button class="icon-btn hover:bg-red-50 hover:text-red-600" aria-label="Delete" @click="remove(sub.id, sub.email)"><Icon name="lucide:trash-2" /></button>
                </div>
              </td>
            </tr>
            <tr v-if="!subs?.length">
              <td colspan="3" class="px-5 py-12 text-center">
                <div class="flex flex-col items-center gap-2 text-ink-faint">
                  <Icon name="lucide:mail" class="text-3xl" />
                  <p class="text-sm">No subscribers yet.</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
