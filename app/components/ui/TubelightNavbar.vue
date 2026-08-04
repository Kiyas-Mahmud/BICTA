<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'

export interface NavItem {
  name: string
  url: string
  icon: string
}

const props = defineProps<{ items: NavItem[]; logoUrl?: string | null }>()

const route = useRoute()

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
  const container = navContainerRef.value
  const elRect = el.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()

  indicatorStyle.value = {
    opacity: '1',
    transform: `translateX(${elRect.left - containerRect.left}px)`,
    width: `${elRect.width}px`,
    height: `${elRect.height}px`,
  }
}

watch(activeIndex, () => nextTick(updateIndicator))

onMounted(() => {
  nextTick(updateIndicator)
  window.addEventListener('resize', updateIndicator)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateIndicator)
})
</script>

<template>
  <!-- ===== Mobile: slim top bar (brand + account actions) ===== -->
  <header class="nav-top-mobile sm:hidden">
    <div class="flex h-14 items-center justify-between gap-3 px-4">
      <NuxtLink to="/" class="flex items-center gap-2" aria-label="BICTA home">
        <img v-if="logoUrl" :src="logoUrl" alt="BICTA" class="h-8 w-8 rounded-lg object-contain" />
        <span v-else class="text-lg font-extrabold tracking-tight text-ink">BICTA<span class="text-brand-600">.</span></span>
      </NuxtLink>
      <div class="flex items-center gap-1.5">
        <NuxtLink
          to="/login"
          class="flex h-10 min-w-[2.5rem] items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-bold text-ink-soft transition-colors active:bg-mist-1"
        >
          Log in
        </NuxtLink>
        <NuxtLink to="/events" class="btn-primary !px-4 !py-2.5 !text-sm">
          Register
        </NuxtLink>
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
          <Icon :name="item.icon" class="nav-tab-icon" />
          <span class="nav-tab-label">{{ item.name }}</span>
        </NuxtLink>
      </li>
    </ul>
  </nav>

  <!-- ===== Desktop: floating logo badge ===== -->
  <div v-if="logoUrl" class="fixed top-6 left-6 z-50 hidden sm:flex">
    <NuxtLink
      to="/"
      class="flex h-12 w-12 items-center justify-center rounded-2xl border border-line/70 bg-white/90 shadow-2xl backdrop-blur-2xl"
      aria-label="BICTA home"
    >
      <img :src="logoUrl" alt="BICTA" class="h-8 w-8 rounded-lg object-contain" />
    </NuxtLink>
  </div>

  <!-- ===== Desktop: floating top pill ===== -->
  <div class="fixed top-6 left-1/2 z-50 hidden -translate-x-1/2 justify-center sm:flex">
    <nav ref="navContainerRef" class="relative flex items-center gap-1.5 overflow-hidden rounded-full border border-line/70 bg-white/90 p-2 pl-3 pr-3.5 shadow-2xl backdrop-blur-2xl">
      <NuxtLink
        v-for="(item, i) in items"
        :key="item.name"
        :ref="(el: any) => { if (el?.$el) navItemRefs[i] = el.$el; else if (el) navItemRefs[i] = el as HTMLElement }"
        :to="item.url"
        class="relative z-10 flex shrink-0 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-extrabold transition-colors"
        :class="activeIndex === i ? 'text-brand-700' : 'text-ink-soft hover:bg-mist-1 hover:text-ink'"
        :title="item.name"
      >
        <Icon :name="item.icon" class="shrink-0 text-lg" />
        <span class="whitespace-nowrap">{{ item.name }}</span>
      </NuxtLink>

      <!-- Active indicator: fully self-contained, so nothing can paint outside
           the pill (the old version leaned on overflow clipping, which is
           unreliable on an element that also carries a backdrop-filter). -->
      <div
        class="nav-desktop-indicator pointer-events-none absolute top-2 z-0"
        :style="indicatorStyle"
      />

      <div class="ml-1.5 flex shrink-0 items-center gap-1.5 border-l border-line/60 pl-2.5">
        <NuxtLink
          to="/login"
          class="flex items-center justify-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-extrabold text-ink-soft transition-colors hover:bg-mist-1 hover:text-ink"
          title="Participant login"
        >
          <Icon name="lucide:log-in" class="text-lg" />
          <span>Log in</span>
        </NuxtLink>
        <NuxtLink
          to="/events"
          class="btn-primary !rounded-full !px-5 !py-2 text-sm font-bold"
          title="Register"
        >
          <span>Register</span>
          <Icon name="lucide:arrow-right" class="ml-0.5 text-xs" />
        </NuxtLink>
      </div>
    </nav>
  </div>
</template>
