<script setup lang="ts">
const { data: settings } = await useFetch('/api/public/settings', { key: 'site-settings' })
function s(key: string, fallback = '') { return (settings.value as any)?.[key] || fallback }

useSeoMeta({ title: 'Contact', description: 'Get in touch with the BICTA team.' })
</script>

<template>
  <section class="container-site section pb-24">
    <SiteBackButton to="/" label="Back to home" />

    <div class="mx-auto mt-6 max-w-5xl">
      <UiContactCard
        title="Get in touch"
        description="Questions about the festival, sponsorship, or partnerships? Fill out the form and we will respond within one business day."
        :contact-info="[
          { icon: 'lucide:mail', label: 'Email', value: s('contact_email', 'hello@bicta.example') },
          { icon: 'lucide:map-pin', label: 'Venue', value: s('venue_name', 'Dhaka, Bangladesh') },
          { icon: 'lucide:navigation', label: 'Address', value: s('venue_address', 'Dhaka, Bangladesh'), className: 'sm:col-span-2 md:col-span-1 xl:col-span-2' },
        ]"
      >
        <SiteContactForm />
      </UiContactCard>

      <div v-if="s('venue_map_embed')" class="card mt-8 overflow-hidden">
        <div class="aspect-[21/9] w-full bg-mist-2">
          <iframe :src="s('venue_map_embed')" class="h-full w-full" style="border: 0" loading="lazy" title="Venue map" />
        </div>
      </div>
    </div>
  </section>
</template>
