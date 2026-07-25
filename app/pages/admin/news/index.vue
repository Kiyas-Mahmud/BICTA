<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const { data: items, refresh } = await useFetch('/api/admin/news')
const filter = ref('all')
const search = ref('')
const toast = useToast()
const { confirm } = useConfirm()

const counts = computed(() => ({
  all: items.value?.length ?? 0,
  published: items.value?.filter((n) => n.status === 'published').length ?? 0,
  draft: items.value?.filter((n) => n.status === 'draft').length ?? 0,
}))
const filters = computed(() => [
  { value: 'all', label: 'All', count: counts.value.all },
  { value: 'published', label: 'Published', count: counts.value.published },
  { value: 'draft', label: 'Draft', count: counts.value.draft },
])

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return (items.value ?? []).filter((n) => {
    const byState = filter.value === 'all' || n.status === filter.value
    const byText = !q || n.title.toLowerCase().includes(q)
    return byState && byText
  })
})

async function remove(id: number, title: string) {
  const ok = await confirm({
    title: `Delete "${title}"?`,
    body: 'The article is removed from the public site permanently.',
    confirmLabel: 'Delete article',
  })
  if (!ok) return
  await $fetch(`/api/admin/news/${id}`, { method: 'DELETE' })
  await refresh()
  toast.success('Article deleted')
}
</script>

<template>
  <div class="space-y-6">
    <AdminPageHeader title="News" subtitle="Announcements and articles shown on the public site." icon="lucide:newspaper">
      <template #actions>
        <NuxtLink to="/admin/news/new" class="btn-primary !py-2.5"><Icon name="lucide:plus" /> New article</NuxtLink>
      </template>
    </AdminPageHeader>

    <div class="toolbar fade-up stagger-1">
      <AdminSegmented v-model="filter" :options="filters" aria-label="Filter articles" />
      <div class="relative ml-auto min-w-[12rem] flex-1 sm:max-w-xs">
        <Icon name="lucide:search" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
        <label class="sr-only" for="news-search">Search articles</label>
        <input id="news-search" v-model="search" type="search" class="input !pl-9" placeholder="Search by title" />
      </div>
    </div>

    <section class="surface fade-up stagger-2 overflow-hidden">
      <div class="table-wrap">
        <table class="console-table min-w-[34rem]">
          <thead>
            <tr>
              <th scope="col">Article</th>
              <th scope="col">Status</th>
              <th scope="col">Published</th>
              <th scope="col" class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="n in filtered" :key="n.id">
              <td>
                <NuxtLink :to="`/admin/news/${n.id}`" class="group flex items-center gap-3">
                  <img v-if="n.coverImage" :src="n.coverImage" alt="" class="h-10 w-14 shrink-0 rounded-lg border border-line object-cover" />
                  <span v-else class="flex h-10 w-14 shrink-0 items-center justify-center rounded-lg bg-mist-1 text-ink-faint ring-1 ring-inset ring-line">
                    <Icon name="lucide:newspaper" />
                  </span>
                  <span class="min-w-0">
                    <span class="block truncate font-semibold text-ink group-hover:text-brand-700">{{ n.title }}</span>
                    <span v-if="n.excerpt" class="block truncate text-xs text-ink-faint">{{ n.excerpt }}</span>
                  </span>
                </NuxtLink>
              </td>
              <td><AdminStatusBadge :status="n.status" /></td>
              <td class="whitespace-nowrap text-ink-soft">{{ n.publishedAt ? formatDay(n.publishedAt) : '—' }}</td>
              <td>
                <div class="row-actions">
                  <NuxtLink :to="`/admin/news/${n.id}`" class="icon-btn-sm icon-btn-brand" :aria-label="`Edit ${n.title}`" title="Edit">
                    <Icon name="lucide:pencil" />
                  </NuxtLink>
                  <button class="icon-btn-sm icon-btn-danger" :aria-label="`Delete ${n.title}`" title="Delete" @click="remove(n.id, n.title)">
                    <Icon name="lucide:trash-2" />
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!filtered.length">
              <td colspan="4" class="!p-0">
                <AdminEmptyState
                  icon="lucide:newspaper"
                  :title="items?.length ? 'Nothing in this view' : 'No articles yet'"
                  :body="items?.length ? 'Try another filter or search term.' : 'Write the first announcement — save it as a draft until it is ready.'"
                >
                  <template v-if="!items?.length" #action>
                    <NuxtLink to="/admin/news/new" class="btn-primary !py-2.5">Write an article</NuxtLink>
                  </template>
                </AdminEmptyState>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
