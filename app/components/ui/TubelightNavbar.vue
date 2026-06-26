<script setup lang="ts">
import { ref, watch, onMounted, nextTick, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'

export interface NavItem {
  name: string
  url: string
  icon: string
}

const props = defineProps<{ items: NavItem[] }>()

const route = useRoute()
const activeIndex = ref(-1)

const navItemRefs = ref<HTMLElement[]>([])
const navContainerRef = ref<HTMLElement>()
const indicatorStyle = ref<Record<string, string>>({})

function getMatchIndex() {
  const idx = props.items.findIndex(item => {
    if (item.url === '/') return route.path === '/'
    return route.path.startsWith(item.url)
  })
  return idx >= 0 ? idx : -1
}

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
  
  // padding is 6px (p-1.5)
  indicatorStyle.value = {
    opacity: '1',
    transform: `translateX(${elRect.left - containerRect.left}px)`,
    width: `${elRect.width}px`,
  }
}

watch(() => route.path, () => {
  activeIndex.value = getMatchIndex()
  nextTick(updateIndicator)
})

onMounted(() => {
  activeIndex.value = getMatchIndex()
  nextTick(updateIndicator)
  window.addEventListener('resize', updateIndicator)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateIndicator)
})
</script>

<template>
  <div class="fixed top-6 left-1/2 -translate-x-1/2 z-50">
    <nav ref="navContainerRef" class="relative flex items-center gap-1 rounded-full border border-white/40 bg-white/50 p-1.5 shadow-xl backdrop-blur-2xl">
      <NuxtLink
        v-for="(item, i) in items"
        :key="item.name"
        :ref="(el: any) => { if (el?.$el) navItemRefs[i] = el.$el; else if (el) navItemRefs[i] = el as HTMLElement }"
        :to="item.url"
        class="relative z-10 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-colors"
        :class="activeIndex === i ? 'text-brand-600' : 'text-ink-soft hover:text-ink hover:bg-mist-1'"
        @click="activeIndex = i; nextTick(updateIndicator)"
      >
        <Icon :name="item.icon" class="text-base" />
        <span class="hidden sm:block">{{ item.name }}</span>
      </NuxtLink>
      
      <!-- Tubelight Active Indicator -->
      <div
        class="absolute bottom-1.5 top-1.5 rounded-full bg-mist-2 transition-all duration-300 ease-out z-0 pointer-events-none"
        :style="indicatorStyle"
      >
        <!-- The tubelight glow -->
        <div class="absolute -bottom-1.5 left-1/2 w-8 -translate-x-1/2 h-1 rounded-t-full bg-brand-600 shadow-[0_-2px_12px_rgba(37,99,235,0.8)]" />
      </div>

      <div class="ml-2 border-l border-line/50 pl-2">
        <NuxtLink to="/sign-in" class="button flex items-center justify-center font-bold text-sm">
          <span class="button-content">Sign In</span>
        </NuxtLink>
      </div>
    </nav>
  </div>
</template>

<style scoped>
.button {
  position: relative;
  overflow: hidden;
  height: 2.25rem; /* 36px to match navbar inner items */
  padding: 0 1.25rem;
  border-radius: 1.5rem;
  background: #3d3a4e;
  background-size: 400%;
  color: #fff;
  border: none;
  cursor: pointer;
}

.button:hover::before {
  transform: scaleX(1);
}

.button-content {
  position: relative;
  z-index: 1;
}

.button::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  transform: scaleX(0);
  transform-origin: 0 50%;
  width: 100%;
  height: inherit;
  border-radius: inherit;
  background: linear-gradient(
    82.3deg,
    rgba(59, 130, 246, 1) 10.8%, /* Bluish */
    rgba(37, 99, 235, 1) 94.3%   /* Bluish */
  );
  transition: all 0.475s;
}
</style>
