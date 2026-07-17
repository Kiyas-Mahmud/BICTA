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
    <div class="admin-head">
      <div>
        <h1 class="admin-h1">News</h1>
        <p class="admin-sub">Announcements and articles shown on the public site.</p>
      </div>
      <NuxtLink to="/admin/news/new" class="btn-primary"><Icon name="lucide:plus" /> New article</NuxtLink>
    </div>

    <div class="mt-5 inline-flex gap-1 rounded-xl border border-line bg-white p-1 shadow-soft">
      <button
        v-for="f in ['all', 'published', 'draft'] as const"
        :key="f"
        class="rounded-lg px-3.5 py-1.5 text-sm font-semibold capitalize transition-colors"
        :class="filter === f ? 'bg-brand-600 text-white' : 'text-ink-soft hover:bg-mist-1'"
        @click="filter = f"
      >
        {{ f }}
      </button>
    </div>

    <div class="mt-5 overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
      <div class="overflow-x-auto">
        <table class="admin-table min-w-[560px]">
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>Published</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="n in filtered" :key="n.id">
              <td>
                <NuxtLink :to="`/admin/news/${n.id}`" class="flex items-center gap-3">
                  <img v-if="n.coverImage" :src="n.coverImage" alt="" class="h-9 w-12 shrink-0 rounded-lg border border-line object-cover" />
                  <span v-else class="flex h-9 w-12 shrink-0 items-center justify-center rounded-lg bg-mist-1 text-ink-faint"><Icon name="lucide:newspaper" /></span>
                  <p class="font-semibold text-ink hover:text-brand-700">{{ n.title }}</p>
                </NuxtLink>
              </td>
              <td>
                <span class="rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize" :class="n.status === 'published' ? 'bg-green-50 text-green-700' : 'bg-mist-2 text-ink-soft'">{{ n.status }}</span>
              </td>
              <td class="text-ink-soft">{{ n.publishedAt ? new Date(n.publishedAt).toLocaleDateString() : '—' }}</td>
              <td>
                <div class="flex items-center justify-end gap-1">
                  <NuxtLink :to="`/admin/news/${n.id}`" class="icon-btn hover:bg-brand-50 hover:text-brand-700" aria-label="Edit"><Icon name="lucide:pencil" /></NuxtLink>
                  <button class="icon-btn hover:bg-red-50 hover:text-red-600" aria-label="Delete" @click="remove(n.id, n.title)"><Icon name="lucide:trash-2" /></button>
                </div>
              </td>
            </tr>
            <tr v-if="!filtered?.length">
              <td colspan="4" class="px-5 py-12 text-center">
                <div class="flex flex-col items-center gap-2 text-ink-faint">
                  <Icon name="lucide:newspaper" class="text-3xl" />
                  <p class="text-sm">No articles{{ filter !== 'all' ? ` (${filter})` : '' }}.</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
