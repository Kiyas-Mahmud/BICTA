<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const { data: items, refresh } = await useFetch('/api/admin/news')
const filter = ref<'all' | 'draft' | 'published'>('all')

const filtered = computed(() =>
  filter.value === 'all' ? items.value : items.value?.filter((n) => n.status === filter.value),
)

async function remove(id: number, title: string) {
  if (!window.confirm(`Delete article "${title}"?`)) return
  await $fetch(`/api/admin/news/${id}`, { method: 'DELETE' })
  await refresh()
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold tracking-tight">News</h1>
      <NuxtLink to="/admin/news/new" class="btn-primary"><Icon name="lucide:plus" /> New article</NuxtLink>
    </div>

    <div class="mt-4 flex gap-2">
      <button
        v-for="f in ['all', 'published', 'draft'] as const"
        :key="f"
        class="rounded-full border border-line px-3 py-1 text-sm font-medium capitalize"
        :class="filter === f ? 'bg-ink text-white' : 'bg-white text-ink-soft hover:bg-neutral-50'"
        @click="filter = f"
      >
        {{ f }}
      </button>
    </div>

    <div class="mt-4 overflow-hidden rounded-xl border border-line bg-white">
      <table class="w-full text-left text-sm">
        <thead class="border-b border-line bg-neutral-50 text-xs uppercase text-ink-soft">
          <tr>
            <th class="px-4 py-3">Title</th>
            <th class="px-4 py-3">Status</th>
            <th class="px-4 py-3">Published</th>
            <th class="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="n in filtered" :key="n.id" class="border-b border-line transition-colors last:border-0 hover:bg-neutral-50">
            <td class="px-4 py-3 font-medium">
              <NuxtLink :to="`/admin/news/${n.id}`" class="hover:text-accent">{{ n.title }}</NuxtLink>
            </td>
            <td class="px-4 py-3">
              <span
                class="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                :class="n.status === 'published' ? 'bg-green-50 text-green-700' : 'bg-neutral-100 text-ink-soft'"
              >
                {{ n.status }}
              </span>
            </td>
            <td class="px-4 py-3 text-ink-soft">{{ n.publishedAt ? new Date(n.publishedAt).toLocaleDateString() : '—' }}</td>
            <td class="px-4 py-3 text-right">
              <NuxtLink :to="`/admin/news/${n.id}`" class="mr-3 font-medium text-accent hover:underline">Edit</NuxtLink>
              <button class="font-medium text-red-600 hover:underline" @click="remove(n.id, n.title)">Delete</button>
            </td>
          </tr>
          <tr v-if="!filtered?.length">
            <td colspan="4" class="px-4 py-10 text-center text-ink-faint">No articles.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
