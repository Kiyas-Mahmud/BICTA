<script setup lang="ts">
const { data: settings } = await useFetch('/api/public/settings', { key: 'site-settings' })
function s(key: string, fallback = '') { return (settings.value as any)?.[key] || fallback }

useSeoMeta({ title: 'Contact', description: 'Get in touch with the BICTA team.' })

const cards = computed(() => [
  s('contact_email') && { icon: 'lucide:mail', tile: 'tile-blue', label: 'Email', value: s('contact_email'), href: `mailto:${s('contact_email')}` },
  s('venue_name') && { icon: 'lucide:map-pin', tile: 'tile-green', label: 'Venue', value: s('venue_name'), sub: s('venue_address') },
  s('facebook_url') && { icon: 'lucide:facebook', tile: 'tile-purple', label: 'Facebook', value: 'Follow us', href: s('facebook_url') },
  s('linkedin_url') && { icon: 'lucide:linkedin', tile: 'tile-cyan', label: 'LinkedIn', value: 'Connect', href: s('linkedin_url') },
].filter(Boolean) as { icon: string; tile: string; label: string; value: string; sub?: string; href?: string }[])
</script>

<template>
  <section class="container-site section">
    <SiteBackButton to="/" label="Back to home" />
    <h1 class="text-display mt-6">Get in touch</h1>
    <p class="mt-3 max-w-lg text-lg text-ink-soft">
      Questions about the festival, sponsorship, or partnerships? Reach out through any channel below.
    </p>

    <div class="mt-10 grid gap-5" style="grid-template-columns: repeat(auto-fit, minmax(240px, 1fr))">
      <component
        :is="c.href ? 'a' : 'div'"
        v-for="c in cards"
        :key="c.label"
        :href="c.href"
        :target="c.href && c.href.startsWith('http') ? '_blank' : undefined"
        :rel="c.href && c.href.startsWith('http') ? 'noopener' : undefined"
        class="card card-hover flex items-start gap-4 p-6"
      >
        <span class="tile h-11 w-11 shrink-0 text-xl" :class="c.tile"><Icon :name="c.icon" /></span>
        <div class="min-w-0">
          <p class="text-xs font-bold uppercase tracking-wide text-ink-faint">{{ c.label }}</p>
          <p class="mt-0.5 font-bold tracking-tight">{{ c.value }}</p>
          <p v-if="c.sub" class="mt-0.5 text-sm text-ink-soft">{{ c.sub }}</p>
        </div>
      </component>
    </div>

    <div v-if="s('venue_map_embed')" class="card mt-8 overflow-hidden">
      <div class="aspect-[21/9] w-full bg-mist-2">
        <iframe :src="s('venue_map_embed')" class="h-full w-full" style="border: 0" loading="lazy" title="Venue map" />
      </div>
    </div>
  </section>
</template>
