<script setup lang="ts">
import { useRoute } from 'vue-router'
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'

const { data: settings } = await useFetch('/api/public/settings', { key: 'site-settings' })

const navItems = [
  { name: 'BICTA', url: '/', icon: 'lucide:home' },
  { name: 'Events', url: '/events', icon: 'lucide:calendar' },
  { name: 'Gallery', url: '/gallery', icon: 'lucide:image' },
  { name: 'News', url: '/news', icon: 'lucide:newspaper' },
  { name: 'Contact', url: '/contact', icon: 'lucide:mail' },
]

const year = new Date().getFullYear()
</script>

<template>
  <div class="flex min-h-screen flex-col bg-paper">
    <!-- Tubelight Navbar -->
    <UiTubelightNavbar :items="navItems" />

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
            <li><NuxtLink to="/events" class="transition-colors hover:text-white">Events</NuxtLink></li>
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
            <NuxtLink to="/privacy" class="transition-colors hover:text-white">Privacy Policy</NuxtLink>
            <NuxtLink to="/terms" class="transition-colors hover:text-white">Terms & Conditions</NuxtLink>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>
