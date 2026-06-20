<script setup lang="ts">
const { data: settings } = await useFetch('/api/public/settings', { key: 'site-settings' })

const route = useRoute()
const mobileOpen = ref(false)
watch(() => route.path, () => (mobileOpen.value = false))

const scrolled = ref(false)
onMounted(() => {
  const onScroll = () => (scrolled.value = window.scrollY > 12)
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
  onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))
})

const nav = [
  { to: '/', label: 'Home', match: (p: string) => p === '/' },
  { to: '/#competitions', label: 'Events', match: () => false },
  { to: '/events', label: 'Past Editions', match: (p: string) => p.startsWith('/events') },
  { to: '/gallery', label: 'Gallery', match: (p: string) => p.startsWith('/gallery') },
  { to: '/contact', label: 'Contact', match: (p: string) => p.startsWith('/contact') },
]

const year = new Date().getFullYear()
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <!-- header -->
    <header
      class="sticky top-0 z-40 border-b transition-all duration-300"
      :class="scrolled ? 'border-line glass-bar' : 'border-transparent bg-white/0'"
    >
      <div class="container-site flex h-16 items-center justify-between gap-4">
        <NuxtLink to="/" class="text-xl font-extrabold tracking-tight">
          BICTA<span class="text-brand-600">.</span>
        </NuxtLink>

        <nav class="hidden items-center gap-1 md:flex">
          <NuxtLink
            v-for="item in nav"
            :key="item.label"
            :to="item.to"
            class="relative px-3.5 py-2 text-sm font-semibold text-ink-soft transition-colors hover:text-ink"
            :class="{ 'text-ink': item.match(route.path) }"
          >
            {{ item.label }}
            <span
              v-if="item.match(route.path)"
              class="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-brand-600"
            />
          </NuxtLink>
        </nav>

        <div class="flex items-center gap-2">
          <NuxtLink to="/#competitions" class="hidden btn-primary !px-4 !py-2.5 sm:inline-flex">Register Now</NuxtLink>
          <button
            class="flex h-10 w-10 items-center justify-center rounded-lg text-ink md:hidden"
            aria-label="Menu"
            @click="mobileOpen = !mobileOpen"
          >
            <Icon :name="mobileOpen ? 'lucide:x' : 'lucide:menu'" class="text-xl" />
          </button>
        </div>
      </div>

      <!-- mobile menu -->
      <Transition name="page">
        <nav v-if="mobileOpen" class="border-t border-line bg-white px-4 py-3 md:hidden">
          <NuxtLink
            v-for="item in nav"
            :key="item.label"
            :to="item.to"
            class="block rounded-lg px-3 py-2.5 text-sm font-semibold text-ink-soft hover:bg-mist-1 hover:text-ink"
          >
            {{ item.label }}
          </NuxtLink>
          <NuxtLink to="/#competitions" class="btn-primary mt-2 w-full">Register Now</NuxtLink>
        </nav>
      </Transition>
    </header>

    <main class="flex-1">
      <slot />
    </main>

    <!-- footer -->
    <footer class="mt-auto bg-ink text-white">
      <div class="container-site grid gap-10 py-14 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <p class="text-2xl font-extrabold tracking-tight">BICTA<span class="text-brand-400">.</span></p>
          <p class="mt-3 max-w-xs text-sm leading-relaxed text-white/60">
            {{ settings?.footer_text ?? 'The national ICT programming festival. Innovate. Code. Compete.' }}
          </p>
          <div class="mt-5 flex items-center gap-2">
            <a v-if="settings?.facebook_url" :href="settings.facebook_url" target="_blank" rel="noopener" aria-label="Facebook" class="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 transition-colors hover:bg-brand-600">
              <Icon name="lucide:facebook" />
            </a>
            <a v-if="settings?.linkedin_url" :href="settings.linkedin_url" target="_blank" rel="noopener" aria-label="LinkedIn" class="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 transition-colors hover:bg-brand-600">
              <Icon name="lucide:linkedin" />
            </a>
            <a v-if="settings?.contact_email" :href="`mailto:${settings.contact_email}`" aria-label="Email" class="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 transition-colors hover:bg-brand-600">
              <Icon name="lucide:mail" />
            </a>
          </div>
        </div>

        <div>
          <p class="text-sm font-bold uppercase tracking-[0.15em] text-white/40">Explore</p>
          <ul class="mt-4 space-y-2.5 text-sm text-white/70">
            <li><NuxtLink to="/" class="transition-colors hover:text-white">Home</NuxtLink></li>
            <li><NuxtLink to="/events" class="transition-colors hover:text-white">Past Editions</NuxtLink></li>
            <li><NuxtLink to="/gallery" class="transition-colors hover:text-white">Gallery</NuxtLink></li>
            <li><NuxtLink to="/news" class="transition-colors hover:text-white">News</NuxtLink></li>
            <li><NuxtLink to="/contact" class="transition-colors hover:text-white">Contact</NuxtLink></li>
          </ul>
        </div>

        <div>
          <p class="text-sm font-bold uppercase tracking-[0.15em] text-white/40">Get in touch</p>
          <ul class="mt-4 space-y-2.5 text-sm text-white/70">
            <li v-if="settings?.contact_email">
              <a :href="`mailto:${settings.contact_email}`" class="transition-colors hover:text-white">{{ settings.contact_email }}</a>
            </li>
            <li v-if="settings?.venue_name">{{ settings.venue_name }}</li>
            <li v-if="settings?.venue_address" class="text-white/50">{{ settings.venue_address }}</li>
          </ul>
        </div>
      </div>

      <div class="border-t border-white/10">
        <div class="container-site flex flex-col items-center justify-between gap-3 py-6 text-sm text-white/50 sm:flex-row">
          <p>© {{ year }} BICTA. All rights reserved.</p>
          <div class="flex items-center gap-5">
            <NuxtLink to="/contact" class="transition-colors hover:text-white">Privacy Policy</NuxtLink>
            <NuxtLink to="/contact" class="transition-colors hover:text-white">Terms & Conditions</NuxtLink>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>
