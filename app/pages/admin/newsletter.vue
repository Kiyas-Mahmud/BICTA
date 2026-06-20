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
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold tracking-tight">Newsletter subscribers</h1>
      <a href="/api/admin/newsletter/export" class="btn-ghost" download><Icon name="lucide:download" /> Export CSV</a>
    </div>

    <p class="mt-2 text-sm text-ink-soft">{{ subs?.length ?? 0 }} subscribers.</p>

    <div class="mt-6 overflow-hidden rounded-xl border border-line bg-white">
      <table class="w-full text-left text-sm">
        <thead class="border-b border-line bg-neutral-50 text-xs uppercase text-ink-soft">
          <tr>
            <th class="px-4 py-3">Email</th>
            <th class="px-4 py-3">Subscribed</th>
            <th class="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="sub in subs" :key="sub.id" class="border-b border-line transition-colors last:border-0 hover:bg-neutral-50">
            <td class="px-4 py-3 font-medium">{{ sub.email }}</td>
            <td class="px-4 py-3 text-ink-soft">{{ new Date(sub.createdAt + 'Z').toLocaleString() }}</td>
            <td class="px-4 py-3 text-right">
              <button class="font-medium text-red-600 hover:underline" @click="remove(sub.id, sub.email)">Delete</button>
            </td>
          </tr>
          <tr v-if="!subs?.length">
            <td colspan="3" class="px-4 py-10 text-center text-ink-faint">No subscribers yet.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
