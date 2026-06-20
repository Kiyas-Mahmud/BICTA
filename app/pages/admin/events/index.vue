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
</script>

<template>
  <div>
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold tracking-tight">Events</h1>
      <NuxtLink to="/admin/events/new" class="btn-primary"><Icon name="lucide:plus" /> New event</NuxtLink>
    </div>

    <div class="mt-6 overflow-hidden rounded-xl border border-line bg-white">
      <table class="w-full text-left text-sm">
        <thead class="border-b border-line bg-neutral-50 text-xs uppercase text-ink-soft">
          <tr>
            <th class="px-4 py-3">Event</th>
            <th class="px-4 py-3">Status</th>
            <th class="px-4 py-3">Dates</th>
            <th class="px-4 py-3">Competitions</th>
            <th class="px-4 py-3">Current</th>
            <th class="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="ev in events" :key="ev.id" class="border-b border-line transition-colors last:border-0 hover:bg-neutral-50">
            <td class="px-4 py-3 font-medium">
              <NuxtLink :to="`/admin/events/${ev.id}`" class="hover:text-accent">{{ ev.title }}</NuxtLink>
              <span class="ml-1 text-ink-faint">({{ ev.year }})</span>
            </td>
            <td class="px-4 py-3 capitalize">{{ ev.status }}</td>
            <td class="px-4 py-3 text-ink-soft">{{ ev.startDate ?? '—' }} → {{ ev.endDate ?? '—' }}</td>
            <td class="px-4 py-3">{{ ev.competitionCount }}</td>
            <td class="px-4 py-3">
              <span v-if="ev.isCurrent" class="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent">Current</span>
              <button v-else class="text-xs font-medium text-ink-faint hover:text-accent" @click="setCurrent(ev.id)">
                Make current
              </button>
            </td>
            <td class="px-4 py-3 text-right">
              <NuxtLink :to="`/admin/events/${ev.id}`" class="mr-3 font-medium text-accent hover:underline">Edit</NuxtLink>
              <button class="font-medium text-red-600 hover:underline" @click="remove(ev.id, ev.title)">Delete</button>
            </td>
          </tr>
          <tr v-if="!events?.length">
            <td colspan="6" class="px-4 py-10 text-center text-ink-faint">No events yet. Create the first one.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
