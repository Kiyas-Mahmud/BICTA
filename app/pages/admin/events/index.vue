<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const { data: events, refresh } = await useFetch('/api/admin/events')
const toast = useToast()
const { confirm } = useConfirm()
const busy = ref<number | null>(null)

async function setCurrent(id: number, title: string) {
  busy.value = id
  try {
    await $fetch(`/api/admin/events/${id}/set-current`, { method: 'POST' })
    await Promise.all([refresh(), refreshAdminStats()])
    toast.success(`${title} is now the current event`)
  } catch {
    toast.error('Could not switch the current event')
  } finally {
    busy.value = null
  }
}

async function remove(id: number, title: string) {
  const ok = await confirm({
    title: `Delete "${title}"?`,
    body: 'This also removes every competition, prize, registration and gallery photo attached to it. It cannot be undone.',
    confirmLabel: 'Delete event',
  })
  if (!ok) return
  await $fetch(`/api/admin/events/${id}`, { method: 'DELETE' })
  await Promise.all([refresh(), refreshAdminStats()])
  toast.success(`${title} deleted`)
}

function dateRange(ev: any) {
  if (!ev.startDate && !ev.endDate) return '—'
  return `${ev.startDate ?? '—'} → ${ev.endDate ?? '—'}`
}
</script>

<template>
  <div class="space-y-6">
    <AdminPageHeader title="Events" subtitle="Each yearly edition and its competitions, prizes and gallery." icon="lucide:calendar-days">
      <template #actions>
        <NuxtLink to="/admin/events/new" class="btn-primary !py-2.5"><Icon name="lucide:plus" /> New event</NuxtLink>
      </template>
    </AdminPageHeader>

    <section class="surface fade-up stagger-1 overflow-hidden">
      <!-- mobile: cards -->
      <ul class="divide-y divide-line lg:hidden">
        <li v-for="ev in events" :key="ev.id" class="p-4">
          <div class="flex items-start gap-3">
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100">
              <Icon name="lucide:calendar-days" />
            </span>
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <NuxtLink :to="`/admin/events/${ev.id}`" class="truncate font-bold text-ink hover:text-brand-700">{{ ev.title }}</NuxtLink>
                <AdminStatusBadge :status="ev.status" />
                <span v-if="ev.isCurrent" class="status status-brand">Current</span>
              </div>
              <p class="mt-0.5 text-xs text-ink-faint">{{ ev.year }} · {{ ev.competitionCount }} competitions</p>
              <p class="mt-0.5 text-xs text-ink-soft">{{ dateRange(ev) }}</p>
              <div class="mt-3 flex flex-wrap gap-2">
                <NuxtLink :to="`/admin/events/${ev.id}`" class="btn-ghost !py-2 !text-xs"><Icon name="lucide:pencil" /> Edit</NuxtLink>
                <button v-if="!ev.isCurrent" class="btn-ghost !py-2 !text-xs" :disabled="busy === ev.id" @click="setCurrent(ev.id, ev.title)">
                  <Icon name="lucide:star" /> Make current
                </button>
                <button class="btn-ghost !py-2 !text-xs !text-red-600" @click="remove(ev.id, ev.title)">
                  <Icon name="lucide:trash-2" /> Delete
                </button>
              </div>
            </div>
          </div>
        </li>
        <li v-if="!events?.length">
          <AdminEmptyState icon="lucide:calendar-plus" title="No events yet" body="Create the first yearly edition to start adding competitions.">
            <template #action><NuxtLink to="/admin/events/new" class="btn-primary !py-2.5">Create event</NuxtLink></template>
          </AdminEmptyState>
        </li>
      </ul>

      <!-- desktop: table -->
      <div class="table-wrap hidden lg:block">
        <table class="console-table">
          <thead>
            <tr>
              <th scope="col">Event</th>
              <th scope="col">Status</th>
              <th scope="col">Dates</th>
              <th scope="col">Competitions</th>
              <th scope="col">Current</th>
              <th scope="col" class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ev in events" :key="ev.id">
              <td>
                <NuxtLink :to="`/admin/events/${ev.id}`" class="group flex items-center gap-3">
                  <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100">
                    <Icon name="lucide:calendar-days" />
                  </span>
                  <span class="min-w-0">
                    <span class="block truncate font-semibold text-ink group-hover:text-brand-700">{{ ev.title }}</span>
                    <span class="block text-xs text-ink-faint">{{ ev.year }}</span>
                  </span>
                </NuxtLink>
              </td>
              <td><AdminStatusBadge :status="ev.status" /></td>
              <td class="whitespace-nowrap text-ink-soft">{{ dateRange(ev) }}</td>
              <td class="font-semibold tabular-nums text-ink">{{ ev.competitionCount }}</td>
              <td>
                <span v-if="ev.isCurrent" class="status status-brand">Current</span>
                <button
                  v-else
                  class="text-xs font-bold text-ink-faint transition-colors hover:text-brand-700"
                  :disabled="busy === ev.id"
                  @click="setCurrent(ev.id, ev.title)"
                >
                  {{ busy === ev.id ? 'Switching…' : 'Make current' }}
                </button>
              </td>
              <td>
                <div class="row-actions">
                  <NuxtLink :to="`/admin/events/${ev.id}`" class="icon-btn-sm icon-btn-brand" :aria-label="`Edit ${ev.title}`" title="Edit">
                    <Icon name="lucide:pencil" />
                  </NuxtLink>
                  <button class="icon-btn-sm icon-btn-danger" :aria-label="`Delete ${ev.title}`" title="Delete" @click="remove(ev.id, ev.title)">
                    <Icon name="lucide:trash-2" />
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!events?.length">
              <td colspan="6" class="!p-0">
                <AdminEmptyState icon="lucide:calendar-plus" title="No events yet" body="Create the first yearly edition to start adding competitions, prizes and registrations.">
                  <template #action><NuxtLink to="/admin/events/new" class="btn-primary !py-2.5">Create event</NuxtLink></template>
                </AdminEmptyState>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
