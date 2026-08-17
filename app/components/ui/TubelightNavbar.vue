<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'

export interface NavItem {
  name: string
  url: string
  icon: string
}

const props = withDefaults(
  defineProps<{ items: NavItem[]; logoUrl?: string | null; brandName?: string | null }>(),
  { logoUrl: null, brandName: 'BICTA' },
)

const route = useRoute()

// Signed-in visitors get a single "Dashboard" button instead of Log in +
// Register. Which console that points at depends on which session key is set
// — the same precedence the login endpoint uses when it resolves an account.
const { session } = useUserSession()
const dashboard = computed(() => {
  const s = session.value as any
  if (s?.user) return s.user.role === 'volunteer' ? '/staff/scan' : '/admin'
  if (s?.judge) return '/judge'
  if (s?.participant) return '/portal'
  return null
})

// Derived from the route, so the active tab is already correct in the SSR
// markup instead of popping in after hydration.
const activeIndex = computed(() => {
  const idx = props.items.findIndex(item => {
    if (item.url === '/') return route.path === '/'
    return route.path.startsWith(item.url)
  })
  return idx >= 0 ? idx : -1
})

// Desktop pill indicator (measured, so it tracks variable-width labels).
// Starts hidden: the position is only knowable after mount, and shipping it
// visible in the SSR markup flashes a stray pill at the far left.
const navItemRefs = ref<HTMLElement[]>([])
const navContainerRef = ref<HTMLElement>()
const indicatorStyle = ref<Record<string, string>>({ opacity: '0', width: '0px' })

function updateIndicator() {
  const idx = activeIndex.value
  if (idx < 0 || !navItemRefs.value[idx] || !navContainerRef.value) {
    indicatorStyle.value = { opacity: '0' }
    return
  }
  const el = navItemRefs.value[idx]

  // offsetLeft/offsetTop are measured against the same box absolute
  // positioning resolves against (the container's padding box), so they stay
  // correct without hand-correcting for its border. getBoundingClientRect
  // deltas do not: they include the border, and a hardcoded `top` ignores
  // that the links are vertically centred against the taller brand badge
  // rather than sitting flush at the container's padding edge.
  indicatorStyle.value = {
    opacity: '1',
    transform: `translateX(${el.offsetLeft}px)`,
    top: `${el.offsetTop}px`,
    width: `${el.offsetWidth}px`,
    height: `${el.offsetHeight}px`,
  }
}

watch(activeIndex, () => nextTick(updateIndicator))

let resizeObserver: ResizeObserver | undefined

onMounted(() => {
  nextTick(updateIndicator)
  // A single post-mount measurement can land before the web font swaps in
  // (Schibsted Grotesk vs. the fallback) or before @nuxt/icon's SVGs finish
  // rendering, both of which reflow the label width after the fact and leave
  // the pill sized for the wrong text. ResizeObserver keeps it honest
  // whenever the actual content box changes, not just on window resize.
  document.fonts?.ready?.then(updateIndicator)
  if (navContainerRef.value && 'ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(() => updateIndicator())
    resizeObserver.observe(navContainerRef.value)
  }
  window.addEventListener('resize', updateIndicator)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateIndicator)
  resizeObserver?.disconnect()
})
</script>

<template>
  <!-- ===== Mobile: slim top bar (brand + account actions) ===== -->
  <header class="nav-top-mobile sm:hidden">
    <div class="flex h-14 items-center justify-between gap-3 px-4">
      <NuxtLink to="/" class="flex items-center gap-2" :aria-label="`${brandName} home`">
        <img v-if="logoUrl" :src="logoUrl" :alt="brandName ?? ''" class="h-8 w-auto max-w-[7rem] object-contain" />
        <span v-else class="text-lg font-extrabold tracking-tight text-ink">{{ brandName }}<span class="text-brand-600">.</span></span>
      </NuxtLink>
      <div class="flex items-center gap-1.5">
        <NuxtLink v-if="dashboard" :to="dashboard" class="btn-primary !px-4 !py-2.5 !text-sm">
          Dashboard
        </NuxtLink>
        <template v-else>
          <NuxtLink
            to="/login"
            class="flex h-10 min-w-[2.5rem] items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-bold text-ink-soft transition-colors active:bg-mist-1"
          >
            Log in
          </NuxtLink>
          <NuxtLink to="/events" class="btn-primary !px-4 !py-2.5 !text-sm">
            Register
          </NuxtLink>
        </template>
      </div>
    </div>
  </header>

  <!-- ===== Mobile: floating bottom tab bar ===== -->
  <nav class="nav-bottom sm:hidden" aria-label="Primary">
    <ul class="nav-bottom-bar">
      <li v-for="(item, i) in items" :key="item.name" class="flex-1">
        <NuxtLink
          :to="item.url"
          class="nav-tab"
          :class="activeIndex === i ? 'nav-tab-active' : ''"
        >
          <!-- indicator sits behind the content, animates between tabs -->
          <span class="nav-tab-pill" aria-hidden="true" />
          <img v-if="logoUrl && item.url === '/'" :src="logoUrl" alt="" class="nav-tab-icon h-5 w-auto max-w-[3rem] object-contain" />
          <Icon v-else :name="item.icon" class="nav-tab-icon" />
          <span class="nav-tab-label">{{ item.name }}</span>
        </NuxtLink>
      </li>
    </ul>
  </nav>

  <!-- ===== Desktop: full-width top bar ===== -->
  <!-- Was a floating centred pill. Full width gives the logo room to be shown
       at a readable size instead of cropped into a 40px circle, and the wider
       bar is what the links/actions split now sits inside. -->
  <header class="nav-desktop hidden sm:block">
    <div class="container-site flex h-20 items-center justify-between gap-6">
      <NuxtLink
        to="/"
        class="flex shrink-0 items-center gap-3 text-ink"
        :aria-label="`${brandName} home`"
      >
        <!-- object-contain, no circular mask: the uploaded mark is a detailed
             emblem, and cropping it to a circle cut off its outer ring. -->
        <img v-if="logoUrl" :src="logoUrl" alt="" class="h-14 w-auto max-w-[13rem] shrink-0 object-contain" />
        <Icon v-else name="lucide:command" class="text-3xl text-brand-600" />
        <span class="whitespace-nowrap text-xl font-extrabold tracking-tight">{{ brandName }}</span>
      </NuxtLink>

      <!-- No overflow-hidden: the Register button carries a drop shadow and a
           -2px hover lift, both of which get sheared off by clipping. The
           active indicator is self-contained, so nothing needs clipping. -->
      <nav ref="navContainerRef" class="relative flex items-center gap-1" aria-label="Primary">
        <template v-for="(item, i) in items" :key="item.name">
          <NuxtLink
            v-if="item.url !== '/'"
            :ref="(el: any) => { if (el?.$el) navItemRefs[i] = el.$el; else if (el) navItemRefs[i] = el as HTMLElement }"
            :to="item.url"
            class="relative z-10 flex h-10 shrink-0 items-center justify-center gap-2 rounded-full px-4 text-sm font-extrabold transition-colors"
            :class="activeIndex === i ? 'text-brand-700' : 'text-ink-soft hover:bg-mist-1 hover:text-ink'"
            :title="item.name"
          >
            <Icon :name="item.icon" class="shrink-0 text-lg" />
            <span class="whitespace-nowrap">{{ item.name }}</span>
          </NuxtLink>
        </template>

        <!-- Active indicator: fully self-contained, so nothing can paint
             outside it (the old version leaned on overflow clipping, which is
             unreliable on an element that also carries a backdrop-filter). -->
        <div
          class="nav-desktop-indicator pointer-events-none absolute left-0 top-0 z-0"
          :style="indicatorStyle"
        />
      </nav>

      <div class="flex shrink-0 items-center gap-1.5">
        <NuxtLink
          v-if="dashboard"
          :to="dashboard"
          class="btn-primary !h-10 !rounded-full !px-5 !py-0 text-sm font-bold"
          title="Go to my dashboard"
        >
          <Icon name="lucide:layout-dashboard" class="text-base" />
          <span>Dashboard</span>
        </NuxtLink>
        <template v-else>
          <NuxtLink
            to="/login"
            class="flex h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-extrabold text-ink-soft transition-colors hover:bg-mist-1 hover:text-ink"
            title="Participant login"
          >
            <Icon name="lucide:log-in" class="text-lg" />
            <span>Log in</span>
          </NuxtLink>
          <NuxtLink
            to="/events"
            class="btn-primary !h-10 !rounded-full !px-5 !py-0 text-sm font-bold"
            title="Register"
          >
            <span>Register</span>
            <Icon name="lucide:arrow-right" class="ml-0.5 text-xs" />
          </NuxtLink>
        </template>
      </div>
    </div>
  </header>
</template>
