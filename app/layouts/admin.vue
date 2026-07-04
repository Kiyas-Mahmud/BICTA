<script setup lang="ts">
const { user, clear } = useUserSession()

const groups = [
  {
    label: '',
    links: [
      { to: '/admin', label: 'Dashboard', icon: 'lucide:layout-dashboard', exact: true },
      { to: '/admin/events', label: 'Events', icon: 'lucide:calendar-days' },
      { to: '/admin/news', label: 'News', icon: 'lucide:newspaper' },
      { to: '/admin/registrations', label: 'Registrations', icon: 'lucide:clipboard-list' },
      { to: '/admin/gallery', label: 'Gallery', icon: 'lucide:images' },
    ],
  },
  {
    label: 'Event day',
    links: [
      { to: '/admin/checkpoints', label: 'Check-in Points', icon: 'lucide:map-pin' },
      { to: '/admin/checkins', label: 'Collection Report', icon: 'lucide:package-check' },
      { to: '/admin/volunteers', label: 'Scanner Volunteers', icon: 'lucide:scan-line' },
    ],
  },
  {
    label: 'Home page',
    links: [
      { to: '/admin/home-features', label: 'Why Join', icon: 'lucide:sparkles' },
      { to: '/admin/timeline', label: 'Timeline', icon: 'lucide:milestone' },
      { to: '/admin/sponsors', label: 'Sponsors', icon: 'lucide:handshake' },
      { to: '/admin/people', label: 'Judges & Speakers', icon: 'lucide:users' },
      { to: '/admin/winners', label: 'Winners', icon: 'lucide:trophy' },
      { to: '/admin/testimonials', label: 'Testimonials', icon: 'lucide:quote' },
      { to: '/admin/how-it-works', label: 'How It Works', icon: 'lucide:list-checks' },
      { to: '/admin/faq', label: 'FAQ', icon: 'lucide:circle-help' },
      { to: '/admin/newsletter', label: 'Newsletter', icon: 'lucide:mail' },
      { to: '/admin/messages', label: 'Messages', icon: 'lucide:inbox' },
    ],
  },
  {
    label: 'System',
    links: [
      { to: '/admin/settings', label: 'Settings', icon: 'lucide:settings' },
      { to: '/admin/account', label: 'Account', icon: 'lucide:user-cog' },
    ],
  },
]

async function logout() {
  await $fetch('/api/admin/auth/logout', { method: 'POST' })
  await clear()
  await navigateTo('/admin/login')
}
</script>

<template>
  <div class="flex min-h-screen bg-neutral-50">
    <aside class="flex w-60 shrink-0 flex-col border-r border-line bg-white">
      <div class="flex h-16 items-center border-b border-line px-6">
        <NuxtLink to="/admin" class="text-lg font-extrabold tracking-tight">
          BICTA <span class="text-xs font-semibold text-ink-faint">ADMIN</span>
        </NuxtLink>
      </div>
      <nav class="flex-1 space-y-4 overflow-y-auto p-3">
        <div v-for="(group, gi) in groups" :key="gi" class="space-y-1">
          <p v-if="group.label" class="px-3 pb-1 pt-2 text-[0.65rem] font-bold uppercase tracking-[0.15em] text-ink-faint">
            {{ group.label }}
          </p>
          <NuxtLink
            v-for="link in group.links"
            :key="link.to"
            :to="link.to"
            class="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-neutral-100 hover:text-ink"
            :class="{
              'bg-accent-soft !text-accent': link.exact
                ? $route.path === link.to
                : $route.path.startsWith(link.to),
            }"
          >
            <Icon :name="link.icon" class="text-base" />
            {{ link.label }}
          </NuxtLink>
        </div>
      </nav>
      <div class="border-t border-line p-4">
        <p class="truncate text-xs text-ink-faint">{{ user?.email }}</p>
        <button class="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700" @click="logout">
          <Icon name="lucide:log-out" /> Log out
        </button>
      </div>
    </aside>

    <main class="min-w-0 flex-1 p-8">
      <slot />
    </main>
  </div>
</template>
