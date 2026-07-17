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
function initials(name: string) {
  return (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
}
</script>

<template>
  <div>
    <div class="admin-head">
      <div>
        <h1 class="admin-h1">Contact messages</h1>
        <p class="admin-sub">Enquiries submitted from the public contact form.</p>
      </div>
      <span v-if="unread" class="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-sm font-bold text-brand-700">
        <span class="h-1.5 w-1.5 rounded-full bg-brand-600" /> {{ unread }} unread
      </span>
    </div>

    <div class="mt-6 overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
      <div class="overflow-x-auto">
        <table class="admin-table min-w-[720px]">
          <thead>
            <tr>
              <th>From</th>
              <th>Subject</th>
              <th>Received</th>
              <th>Status</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="m in messages" :key="m.id">
              <tr :class="{ 'bg-brand-50/40': !m.isRead }">
                <td>
                  <button class="flex items-center gap-3 text-left" @click="expanded = expanded === m.id ? null : m.id">
                    <span class="avatar-chip">{{ initials(m.name) }}</span>
                    <div class="min-w-0">
                      <p class="truncate text-ink hover:text-brand-700" :class="m.isRead ? 'font-medium' : 'font-bold'">{{ m.name }}</p>
                      <p class="truncate text-xs text-ink-faint">{{ m.email }}</p>
                    </div>
                    <Icon name="lucide:chevron-down" class="text-ink-faint transition-transform" :class="{ 'rotate-180': expanded === m.id }" />
                  </button>
                </td>
                <td class="text-ink-soft">{{ m.subject || '—' }}</td>
                <td class="text-ink-soft">{{ new Date(m.createdAt + 'Z').toLocaleDateString() }}</td>
                <td>
                  <span class="rounded-full px-2.5 py-0.5 text-xs font-semibold" :class="m.isRead ? 'bg-mist-2 text-ink-soft' : 'bg-brand-50 text-brand-700'">{{ m.isRead ? 'Read' : 'New' }}</span>
                </td>
                <td>
                  <div class="flex items-center justify-end gap-1">
                    <button class="icon-btn hover:bg-brand-50 hover:text-brand-700" :aria-label="m.isRead ? 'Mark unread' : 'Mark read'" @click="toggleRead(m)">
                      <Icon :name="m.isRead ? 'lucide:mail' : 'lucide:mail-open'" />
                    </button>
                    <button class="icon-btn hover:bg-red-50 hover:text-red-600" aria-label="Delete" @click="remove(m)"><Icon name="lucide:trash-2" /></button>
                  </div>
                </td>
              </tr>
              <tr v-if="expanded === m.id" class="bg-mist-1">
                <td colspan="5" class="px-5 py-4 text-sm">
                  <p class="whitespace-pre-wrap text-ink-soft">{{ m.message }}</p>
                  <a :href="`mailto:${m.email}`" class="mt-3 inline-flex items-center gap-1.5 font-semibold text-brand-700 hover:text-brand-800">
                    <Icon name="lucide:reply" /> Reply by email
                  </a>
                </td>
              </tr>
            </template>
            <tr v-if="!messages?.length">
              <td colspan="5" class="px-5 py-12 text-center">
                <div class="flex flex-col items-center gap-2 text-ink-faint">
                  <Icon name="lucide:inbox" class="text-3xl" />
                  <p class="text-sm">No messages yet.</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
