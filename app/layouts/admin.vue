<script setup lang="ts">
const { user } = useUserSession()
const route = useRoute()

const groups = [
  {
    label: 'Main',
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

const allLinks = groups.flatMap((g) => g.links)
function isActive(link: { to: string; exact?: boolean }) {
  return link.exact ? route.path === link.to : route.path.startsWith(link.to)
}
// Longest-prefix match so /admin/events/3 still lights up "Events".
const current = computed(() => {
  const matches = allLinks.filter((l) => (l.exact ? route.path === l.to : route.path.startsWith(l.to)))
  return matches.sort((a, b) => b.to.length - a.to.length)[0] ?? allLinks[0]
})

const initials = computed(() => {
  const n = (user.value as any)?.name || (user.value as any)?.email || 'A'
  return n.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((p: string) => p[0]?.toUpperCase()).join('')
})

// Lightweight badge counts for the top bar (pending registrations + new messages).
const { data: badge } = useFetch('/api/admin/stats', { key: 'admin-stats', lazy: true })
const alerts = computed(() => (badge.value?.pendingRegistrations ?? 0) + (badge.value?.unreadMessages ?? 0))

const sidebarOpen = ref(false)
watch(() => route.path, () => (sidebarOpen.value = false))

const menuOpen = ref(false)
async function logout() {
  await $fetch('/api/admin/auth/logout', { method: 'POST' }).catch(() => {})
  // Hard reload avoids the client session-ref race that can stall the redirect.
  window.location.href = '/admin/login'
}
</script>

<template>
  <div class="min-h-screen bg-paper">
    <!-- Fixed sidebar -->
    <aside
      class="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-line bg-white transition-transform duration-300 lg:translate-x-0"
      :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <div class="flex h-16 items-center gap-2.5 px-5">
        <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-soft">
          <Icon name="lucide:command" class="text-lg" />
        </span>
        <div class="leading-tight">
          <p class="text-sm font-extrabold tracking-tight">BICTA</p>
          <p class="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-ink-faint">Admin Console</p>
        </div>
      </div>

      <nav class="flex-1 space-y-5 overflow-y-auto px-3 pb-4 pt-2">
        <div v-for="(group, gi) in groups" :key="gi" class="space-y-0.5">
          <p class="px-3 pb-1 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-ink-faint">
            {{ group.label }}
          </p>
          <NuxtLink
            v-for="link in group.links"
            :key="link.to"
            :to="link.to"
            class="group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors"
            :class="isActive(link)
              ? 'bg-brand-50 text-brand-800'
              : 'text-ink-soft hover:bg-mist-1 hover:text-ink'"
          >
            <span
              class="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand-600 transition-opacity"
              :class="isActive(link) ? 'opacity-100' : 'opacity-0'"
            />
            <Icon :name="link.icon" class="text-base" :class="isActive(link) ? 'text-brand-700' : 'text-ink-faint group-hover:text-ink-soft'" />
            {{ link.label }}
          </NuxtLink>
        </div>
      </nav>

      <div class="border-t border-line p-3">
        <div class="flex items-center gap-3 rounded-xl px-2 py-2">
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-800">{{ initials }}</span>
          <div class="min-w-0 flex-1 leading-tight">
            <p class="truncate text-sm font-semibold text-ink">{{ (user as any)?.name || 'Administrator' }}</p>
            <p class="truncate text-xs text-ink-faint">{{ user?.email }}</p>
          </div>
          <button
            class="flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-mist-1 hover:text-red-600"
            aria-label="Log out"
            @click="logout"
          >
            <Icon name="lucide:log-out" />
          </button>
        </div>
      </div>
    </aside>

    <!-- Mobile backdrop -->
    <div v-if="sidebarOpen" class="fixed inset-0 z-40 bg-ink/30 lg:hidden" @click="sidebarOpen = false" />

    <!-- Content column -->
    <div class="lg:pl-64">
      <!-- Fixed top navbar -->
      <header class="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-line bg-white/85 px-4 backdrop-blur-md sm:px-6">
        <button class="flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft hover:bg-mist-1 lg:hidden" aria-label="Menu" @click="sidebarOpen = true">
          <Icon name="lucide:menu" />
        </button>

        <div class="min-w-0 flex-1">
          <h1 class="truncate text-base font-bold tracking-tight text-ink">{{ current.label }}</h1>
          <p class="hidden truncate text-xs text-ink-faint sm:block">Welcome back{{ (user as any)?.name ? `, ${(user as any).name}` : '' }}</p>
        </div>

        <div class="flex items-center gap-2">
          <NuxtLink to="/" target="_blank" class="hidden items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold text-ink-soft transition-colors hover:border-brand-200 hover:text-ink sm:inline-flex">
            <Icon name="lucide:external-link" /> View site
          </NuxtLink>
          <NuxtLink to="/admin/messages" class="relative flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-mist-1" aria-label="Alerts">
            <Icon name="lucide:bell" />
            <span v-if="alerts" class="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[0.6rem] font-bold text-white">{{ alerts > 9 ? '9+' : alerts }}</span>
          </NuxtLink>

          <div class="relative">
            <div v-if="menuOpen" class="fixed inset-0 z-40" @click="menuOpen = false" />
            <button class="relative z-50 flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition-colors hover:bg-mist-1" @click="menuOpen = !menuOpen">
              <span class="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-800">{{ initials }}</span>
              <Icon name="lucide:chevron-down" class="text-ink-faint" />
            </button>
            <div v-if="menuOpen" class="absolute right-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-lift" @click="menuOpen = false">
              <NuxtLink to="/admin/account" class="flex items-center gap-2 px-4 py-2 text-sm text-ink-soft hover:bg-mist-1"><Icon name="lucide:user-cog" /> Account</NuxtLink>
              <NuxtLink to="/admin/settings" class="flex items-center gap-2 px-4 py-2 text-sm text-ink-soft hover:bg-mist-1"><Icon name="lucide:settings" /> Settings</NuxtLink>
              <button class="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-mist-1" @click="logout"><Icon name="lucide:log-out" /> Log out</button>
            </div>
          </div>
        </div>
      </header>

      <main class="min-w-0 p-4 sm:p-6 lg:p-8">
        <slot />
      </main>
    </div>
  </div>
</template>
