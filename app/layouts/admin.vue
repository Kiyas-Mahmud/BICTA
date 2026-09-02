<script setup lang="ts">
const { user } = useUserSession()
const route = useRoute()
const { data: settings } = await useFetch('/api/public/settings', { key: 'site-settings' })

// Main admins see everything; moderators do the same content work but never
// site settings, moderator management or the activity log. Links marked
// mainAdmin are filtered out below — the real boundary is requireMainAdmin()
// on those endpoints, this just avoids showing a door that would 403.
const isMainAdmin = computed(() => ((user.value as any)?.role ?? 'admin') === 'admin')

const allGroups = [
  {
    label: 'Main',
    links: [
      { to: '/admin', label: 'Dashboard', icon: 'lucide:layout-dashboard', exact: true },
      { to: '/admin/events', label: 'Events', icon: 'lucide:calendar-days' },
      { to: '/admin/news', label: 'News', icon: 'lucide:newspaper' },
      { to: '/admin/application-center', label: 'Application Center', icon: 'lucide:clipboard-check' },
      { to: '/admin/registrations', label: 'Registrations', icon: 'lucide:clipboard-list' },
      { to: '/admin/participants', label: 'Participants', icon: 'lucide:users' },
      { to: '/admin/leaderboard', label: 'Leaderboard', icon: 'lucide:trophy' },
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
    // Announcements, prize pool, schedule and judging criteria are edited on
    // the event they belong to (Events > open one), not as separate screens.
    label: 'Shared content',
    links: [
      { to: '/admin/home-features', label: 'Why Join', icon: 'lucide:sparkles' },
      { to: '/admin/timeline', label: 'Timeline', icon: 'lucide:milestone' },
      { to: '/admin/sponsors', label: 'Sponsors', icon: 'lucide:handshake' },
      { to: '/admin/people', label: 'Judges & Speakers', icon: 'lucide:users' },
      { to: '/admin/advisors', label: 'Advisor Panel', icon: 'lucide:user-round-check' },
      { to: '/admin/winners', label: 'Winners', icon: 'lucide:trophy' },
      { to: '/admin/how-it-works', label: 'How It Works', icon: 'lucide:list-checks' },
      { to: '/admin/faq', label: 'FAQ', icon: 'lucide:circle-help' },
      { to: '/admin/newsletter', label: 'Newsletter', icon: 'lucide:mail' },
      { to: '/admin/messages', label: 'Messages', icon: 'lucide:inbox' },
    ],
  },
  {
    label: 'System',
    links: [
      { to: '/admin/mailer', label: 'Send Mail', icon: 'lucide:send', mainAdmin: true },
      { to: '/admin/settings', label: 'Settings', icon: 'lucide:settings', mainAdmin: true },
      { to: '/admin/moderators', label: 'Moderators', icon: 'lucide:shield', mainAdmin: true },
      { to: '/admin/activity', label: 'Activity Log', icon: 'lucide:history', mainAdmin: true },
      { to: '/admin/account', label: 'Account', icon: 'lucide:user-cog' },
    ],
  },
] as { label: string; links: { to: string; label: string; icon: string; exact?: boolean; mainAdmin?: boolean }[] }[]

const groups = computed(() =>
  allGroups
    .map((g) => ({ ...g, links: g.links.filter((l) => !l.mainAdmin || isMainAdmin.value) }))
    .filter((g) => g.links.length > 0),
)

const allLinks = computed(() => groups.value.flatMap((g) => g.links))
function isActive(link: { to: string; exact?: boolean }) {
  return link.exact ? route.path === link.to : route.path.startsWith(link.to)
}
// Longest-prefix match so /admin/events/3 still lights up "Events".
const current = computed(() => {
  const links = allLinks.value
  const matches = links.filter((l) => (l.exact ? route.path === l.to : route.path.startsWith(l.to)))
  return matches.sort((a, b) => b.to.length - a.to.length)[0] ?? links[0]
})
const currentGroup = computed(() => groups.value.find((g) => g.links.some((l) => l.to === current.value?.to))?.label ?? '')
// Deeper routes (e.g. /admin/events/3) get a third crumb so the user knows the level.
const isDetail = computed(() => current.value && !current.value.exact && route.path !== current.value.to)

const initials = computed(() => initialsOf((user.value as any)?.name || (user.value as any)?.email || 'Admin'))

// Lightweight badge counts for the top bar (pending registrations + new messages).
const { data: badge } = useFetch('/api/admin/badges', { key: ADMIN_STATS_KEY, lazy: true })
const alerts = computed(() => (badge.value?.pendingRegistrations ?? 0) + (badge.value?.unreadMessages ?? 0))
const alertLabel = computed(() =>
  alerts.value
    ? `${badge.value?.pendingRegistrations ?? 0} registrations to review, ${badge.value?.unreadMessages ?? 0} unread messages`
    : 'Nothing needs attention',
)

const sidebarOpen = ref(false)
watch(() => route.path, () => {
  sidebarOpen.value = false
  menuOpen.value = false
})

const menuOpen = ref(false)
const loggingOut = ref(false)

function onKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  sidebarOpen.value = false
  menuOpen.value = false
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

async function logout() {
  if (loggingOut.value) return
  loggingOut.value = true
  await $fetch('/api/admin/auth/logout', { method: 'POST' }).catch(() => {})
  // Hard reload avoids the client session-ref race that can stall the redirect.
  window.location.href = '/login'
}
</script>

<template>
  <div class="min-h-screen bg-paper">
    <a
      href="#admin-main"
      class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[120] focus:rounded-xl focus:bg-white focus:px-4 focus:py-2.5 focus:text-sm focus:font-bold focus:shadow-lift"
    >
      Skip to content
    </a>

    <!-- Fixed sidebar -->
    <aside
      id="admin-nav"
      class="fixed inset-y-0 left-0 z-50 flex w-[16.5rem] flex-col border-r border-line bg-white transition-transform duration-300 ease-liquid lg:translate-x-0"
      :class="sidebarOpen ? 'translate-x-0 shadow-lift' : '-translate-x-full'"
    >
      <div class="flex h-16 shrink-0 items-center gap-2.5 border-b border-line px-5">
        <span v-if="settings?.site_logo_url" class="flex h-9 w-36 shrink-0 items-center overflow-hidden">
          <img :src="settings.site_logo_url" :alt="settings?.brand_name || 'BICTA'" class="w-36 max-w-none object-contain" />
        </span>
        <span v-else class="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-soft">
          <Icon name="lucide:command" class="text-lg" />
        </span>
        <div class="min-w-0 leading-tight">
          <p v-if="!settings?.site_logo_url" class="text-sm font-extrabold tracking-tight">{{ settings?.brand_name || 'BICTA' }}</p>
          <p class="console-label">Admin Console</p>
        </div>
        <button
          class="icon-btn-sm ml-auto lg:hidden"
          aria-label="Close navigation"
          @click="sidebarOpen = false"
        >
          <Icon name="lucide:x" />
        </button>
      </div>

      <nav class="flex-1 space-y-6 overflow-y-auto px-3 py-4" aria-label="Admin sections">
        <div v-for="(group, gi) in groups" :key="gi" class="space-y-0.5">
          <p class="console-label px-3 pb-1.5">{{ group.label }}</p>
          <NuxtLink
            v-for="link in group.links"
            :key="link.to"
            :to="link.to"
            class="group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors duration-150"
            :class="isActive(link)
              ? 'bg-brand-50 font-semibold text-brand-800'
              : 'text-ink-soft hover:bg-mist-1 hover:text-ink'"
            :aria-current="isActive(link) ? 'page' : undefined"
          >
            <span
              class="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand-700 transition-all duration-200"
              :class="isActive(link) ? 'opacity-100' : 'scale-y-50 opacity-0'"
            />
            <Icon
              :name="link.icon"
              class="shrink-0 text-base transition-colors"
              :class="isActive(link) ? 'text-brand-700' : 'text-ink-faint group-hover:text-ink-soft'"
            />
            <span class="truncate">{{ link.label }}</span>
            <span
              v-if="link.to === '/admin/registrations' && badge?.pendingRegistrations"
              class="ml-auto rounded-full bg-amber-50 px-1.5 py-0.5 text-[0.65rem] font-bold text-amber-700"
            >{{ badge.pendingRegistrations }}</span>
            <span
              v-else-if="link.to === '/admin/messages' && badge?.unreadMessages"
              class="ml-auto rounded-full bg-brand-100 px-1.5 py-0.5 text-[0.65rem] font-bold text-brand-800"
            >{{ badge.unreadMessages }}</span>
          </NuxtLink>
        </div>
      </nav>

      <div class="shrink-0 border-t border-line p-3">
        <div class="flex items-center gap-3 rounded-xl px-2 py-2">
          <AdminAvatar :name="(user as any)?.name || user?.email" />
          <div class="min-w-0 flex-1 leading-tight">
            <p class="truncate text-sm font-semibold text-ink">{{ (user as any)?.name || 'Administrator' }}</p>
            <p class="truncate text-xs text-ink-faint">{{ user?.email }}</p>
          </div>
          <button
            class="icon-btn-sm icon-btn-danger"
            :aria-label="loggingOut ? 'Signing out' : 'Log out'"
            :disabled="loggingOut"
            @click="logout"
          >
            <Icon :name="loggingOut ? 'lucide:loader-2' : 'lucide:log-out'" :class="{ 'animate-spin': loggingOut }" />
          </button>
        </div>
      </div>
    </aside>

    <!-- Mobile backdrop -->
    <Transition
      enter-active-class="transition-opacity duration-200" enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-200" leave-to-class="opacity-0"
    >
      <div v-if="sidebarOpen" class="fixed inset-0 z-40 bg-ink/40 backdrop-blur-[2px] lg:hidden" @click="sidebarOpen = false" />
    </Transition>

    <!-- Content column -->
    <div class="lg:pl-[16.5rem]">
      <header class="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-white/85 px-4 backdrop-blur-md sm:px-6">
        <button
          class="icon-btn-sm h-9 w-9 lg:hidden"
          aria-label="Open navigation"
          aria-controls="admin-nav"
          :aria-expanded="sidebarOpen"
          @click="sidebarOpen = true"
        >
          <Icon name="lucide:menu" />
        </button>

        <nav class="min-w-0 flex-1" aria-label="Breadcrumb">
          <ol class="hidden items-center gap-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-ink-faint sm:flex">
            <li v-if="currentGroup">{{ currentGroup }}</li>
            <li v-if="currentGroup" aria-hidden="true"><Icon name="lucide:chevron-right" class="text-[0.8rem]" /></li>
            <li>
              <NuxtLink :to="current.to" class="transition-colors hover:text-ink-soft">{{ current.label }}</NuxtLink>
            </li>
            <template v-if="isDetail">
              <li aria-hidden="true"><Icon name="lucide:chevron-right" class="text-[0.8rem]" /></li>
              <li class="text-brand-700">Details</li>
            </template>
          </ol>
          <p class="truncate text-base font-bold tracking-tight text-ink sm:text-sm">{{ current.label }}</p>
        </nav>

        <div class="flex items-center gap-1.5">
          <NuxtLink
            to="/"
            target="_blank"
            class="hidden items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold text-ink-soft transition-colors hover:border-brand-300 hover:text-brand-800 sm:inline-flex"
          >
            <Icon name="lucide:external-link" /> View site
          </NuxtLink>

          <NuxtLink
            to="/admin/registrations"
            class="icon-btn-sm relative h-9 w-9"
            :aria-label="alertLabel"
            :title="alertLabel"
          >
            <Icon name="lucide:bell" />
            <span
              v-if="alerts"
              class="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-700 px-1 text-[0.6rem] font-bold text-white ring-2 ring-white"
            >{{ alerts > 9 ? '9+' : alerts }}</span>
          </NuxtLink>

          <div class="relative">
            <div v-if="menuOpen" class="fixed inset-0 z-40" @click="menuOpen = false" />
            <button
              class="relative z-50 flex items-center gap-1.5 rounded-xl py-1 pl-1 pr-1.5 transition-colors hover:bg-mist-1"
              aria-haspopup="menu"
              :aria-expanded="menuOpen"
              aria-label="Account menu"
              @click="menuOpen = !menuOpen"
            >
              <AdminAvatar :name="(user as any)?.name || user?.email" size="sm" />
              <Icon name="lucide:chevron-down" class="text-ink-faint transition-transform duration-200" :class="{ 'rotate-180': menuOpen }" />
            </button>
            <Transition
              enter-active-class="transition duration-150 ease-out" enter-from-class="-translate-y-1 opacity-0"
              leave-active-class="transition duration-100 ease-in" leave-to-class="-translate-y-1 opacity-0"
            >
              <div
                v-if="menuOpen"
                class="absolute right-0 top-full z-50 mt-1.5 w-56 overflow-hidden rounded-2xl border border-line bg-white py-1.5 shadow-lift"
                role="menu"
              >
                <div class="border-b border-line px-4 pb-2.5 pt-1.5">
                  <p class="truncate text-sm font-bold text-ink">{{ (user as any)?.name || 'Administrator' }}</p>
                  <p class="truncate text-xs text-ink-faint">{{ user?.email }}</p>
                </div>
                <NuxtLink to="/admin/account" role="menuitem" class="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-soft transition-colors hover:bg-mist-1 hover:text-ink" @click="menuOpen = false">
                  <Icon name="lucide:user-cog" class="text-ink-faint" /> Account
                </NuxtLink>
                <NuxtLink to="/admin/settings" role="menuitem" class="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-soft transition-colors hover:bg-mist-1 hover:text-ink" @click="menuOpen = false">
                  <Icon name="lucide:settings" class="text-ink-faint" /> Settings
                </NuxtLink>
                <NuxtLink to="/" target="_blank" role="menuitem" class="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-soft transition-colors hover:bg-mist-1 hover:text-ink sm:hidden">
                  <Icon name="lucide:external-link" class="text-ink-faint" /> View site
                </NuxtLink>
                <button
                  role="menuitem"
                  class="flex w-full items-center gap-2.5 border-t border-line px-4 py-2.5 text-left text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
                  :disabled="loggingOut"
                  @click="logout"
                >
                  <Icon :name="loggingOut ? 'lucide:loader-2' : 'lucide:log-out'" :class="{ 'animate-spin': loggingOut }" />
                  {{ loggingOut ? 'Signing out…' : 'Log out' }}
                </button>
              </div>
            </Transition>
          </div>
        </div>
      </header>

      <main id="admin-main" class="mx-auto min-w-0 max-w-[92rem] p-4 sm:p-6 lg:p-8">
        <slot />
      </main>
    </div>

    <AdminToaster />
    <AdminConfirmDialog />
  </div>
</template>
