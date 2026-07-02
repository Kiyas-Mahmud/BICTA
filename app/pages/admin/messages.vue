<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

interface Message {
  id: number
  name: string
  email: string
  subject: string
  message: string
  isRead: boolean
  createdAt: string
}

const { data: messages, refresh } = await useFetch<Message[]>('/api/admin/contact-messages')
const expanded = ref<number | null>(null)

async function toggleRead(m: Message) {
  await $fetch(`/api/admin/contact-messages/${m.id}`, { method: 'PUT', body: { isRead: !m.isRead } })
  await refresh()
}

async function remove(m: Message) {
  if (!window.confirm(`Delete message from ${m.name}?`)) return
  await $fetch(`/api/admin/contact-messages/${m.id}`, { method: 'DELETE' })
  await refresh()
}

const unread = computed(() => messages.value?.filter((m) => !m.isRead).length ?? 0)
</script>

<template>
  <div>
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold tracking-tight">Contact messages</h1>
      <span v-if="unread" class="rounded-full bg-accent-soft px-3 py-1 text-sm font-semibold text-accent">{{ unread }} unread</span>
    </div>

    <div class="mt-6 overflow-hidden rounded-xl border border-line bg-white">
      <table class="w-full text-left text-sm">
        <thead class="border-b border-line bg-neutral-50 text-xs uppercase text-ink-soft">
          <tr>
            <th class="px-4 py-3">From</th>
            <th class="px-4 py-3">Subject</th>
            <th class="px-4 py-3">Received</th>
            <th class="px-4 py-3">Status</th>
            <th class="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="m in messages" :key="m.id">
            <tr class="border-b border-line transition-colors last:border-0 hover:bg-neutral-50" :class="{ 'font-semibold': !m.isRead }">
              <td class="px-4 py-3">
                <button class="text-left hover:text-accent" @click="expanded = expanded === m.id ? null : m.id">
                  {{ m.name }}
                </button>
                <p class="text-xs font-normal text-ink-faint">{{ m.email }}</p>
              </td>
              <td class="px-4 py-3">{{ m.subject || '—' }}</td>
              <td class="px-4 py-3 text-ink-soft">{{ new Date(m.createdAt + 'Z').toLocaleString() }}</td>
              <td class="px-4 py-3">
                <span class="rounded-full px-2.5 py-0.5 text-xs font-semibold" :class="m.isRead ? 'bg-neutral-100 text-ink-soft' : 'bg-accent-soft text-accent'">
                  {{ m.isRead ? 'Read' : 'New' }}
                </span>
              </td>
              <td class="px-4 py-3 text-right">
                <button class="mr-3 font-medium text-accent hover:underline" @click="toggleRead(m)">
                  Mark {{ m.isRead ? 'unread' : 'read' }}
                </button>
                <button class="font-medium text-red-600 hover:underline" @click="remove(m)">Delete</button>
              </td>
            </tr>
            <tr v-if="expanded === m.id" class="border-b border-line bg-neutral-50 last:border-0">
              <td colspan="5" class="px-4 py-4 text-sm">
                <p class="whitespace-pre-wrap">{{ m.message }}</p>
                <a :href="`mailto:${m.email}`" class="mt-3 inline-flex items-center gap-1.5 font-medium text-accent hover:underline">
                  <Icon name="lucide:reply" /> Reply by email
                </a>
              </td>
            </tr>
          </template>
          <tr v-if="!messages?.length">
            <td colspan="5" class="px-4 py-10 text-center text-ink-faint">No messages yet.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
