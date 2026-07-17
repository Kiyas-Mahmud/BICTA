<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const { data: events, refresh } = await useFetch('/api/admin/events')

async function setCurrent(id: number) {
  await $fetch(`/api/admin/events/${id}/set-current`, { method: 'POST' })
  await refresh()
}

async function remove(id: number, title: string) {
  if (!window.confirm(`Delete "${title}"? This removes all its competitions, prizes, registrations and gallery photos.`)) return
  await $fetch(`/api/admin/events/${id}`, { method: 'DELETE' })
  await refresh()
}

const statusPill: Record<string, string> = {
  upcoming: 'bg-brand-50 text-brand-700',
  ongoing: 'bg-green-50 text-green-700',
  past: 'bg-mist-2 text-ink-soft',
}
</script>

<template>
  <div>
    <div class="admin-head">
      <div>
        <h1 class="admin-h1">Events</h1>
        <p class="admin-sub">Each yearly edition and its competitions, prizes and gallery.</p>
      </div>
      <NuxtLink to="/admin/events/new" class="btn-primary"><Icon name="lucide:plus" /> New event</NuxtLink>
    </div>

    <div class="mt-6 overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
      <div class="overflow-x-auto">
        <table class="admin-table min-w-[720px]">
          <thead>
            <tr>
              <th>Event</th>
              <th>Status</th>
              <th>Dates</th>
              <th>Competitions</th>
              <th>Current</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ev in events" :key="ev.id">
              <td>
                <NuxtLink :to="`/admin/events/${ev.id}`" class="flex items-center gap-3">
                  <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                    <Icon name="lucide:calendar-days" />
                  </span>
                  <div>
                    <p class="font-semibold text-ink hover:text-brand-700">{{ ev.title }}</p>
                    <p class="text-xs text-ink-faint">{{ ev.year }}</p>
                  </div>
                </NuxtLink>
              </td>
              <td>
                <span class="rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize" :class="statusPill[ev.status]">{{ ev.status }}</span>
              </td>
              <td class="text-ink-soft">{{ ev.startDate ?? '—' }} <span class="text-ink-faint">→</span> {{ ev.endDate ?? '—' }}</td>
              <td class="font-semibold text-ink">{{ ev.competitionCount }}</td>
              <td>
                <span v-if="ev.isCurrent" class="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-bold text-brand-700">
                  <span class="h-1.5 w-1.5 rounded-full bg-brand-600" /> Current
                </span>
                <button v-else class="text-xs font-semibold text-ink-faint transition-colors hover:text-brand-700" @click="setCurrent(ev.id)">
                  Make current
                </button>
              </td>
              <td>
                <div class="flex items-center justify-end gap-1">
                  <NuxtLink :to="`/admin/events/${ev.id}`" class="icon-btn hover:bg-brand-50 hover:text-brand-700" aria-label="Edit"><Icon name="lucide:pencil" /></NuxtLink>
                  <button class="icon-btn hover:bg-red-50 hover:text-red-600" aria-label="Delete" @click="remove(ev.id, ev.title)"><Icon name="lucide:trash-2" /></button>
                </div>
              </td>
            </tr>
            <tr v-if="!events?.length">
              <td colspan="6" class="px-5 py-12 text-center">
                <div class="flex flex-col items-center gap-2 text-ink-faint">
                  <Icon name="lucide:calendar-plus" class="text-3xl" />
                  <p class="text-sm">No events yet.</p>
                  <NuxtLink to="/admin/events/new" class="text-sm font-bold text-brand-700 hover:text-brand-800">+ Create the first event</NuxtLink>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
