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
  <section class="container-site section pb-24">
    <SiteBackButton to="/" label="Back to home" />

    <div class="mx-auto mt-6 max-w-5xl">
      <UiContactCard
        title="Get in touch"
        description="If you have any questions regarding our Services or need help, please fill out the form here. We do our best to respond within 1 business day."
        :contact-info="[
          { icon: 'lucide:mail', label: 'Email', value: s('contact_email') || 'contact@bicta.com' },
          { icon: 'lucide:phone', label: 'Phone', value: '+880 1234 567890' },
          { icon: 'lucide:map-pin', label: 'Address', value: s('venue_address') || 'Dhaka, Bangladesh', className: 'col-span-2 sm:col-span-1 xl:col-span-2' }
        ]"
      >
        <form @submit.prevent="" class="w-full space-y-4">
          <div class="flex flex-col gap-2">
            <UiLabel>Name</UiLabel>
            <UiInput type="text" placeholder="Your name" />
          </div>
          <div class="flex flex-col gap-2">
            <UiLabel>Email</UiLabel>
            <UiInput type="email" placeholder="you@email.com" />
          </div>
          <div class="flex flex-col gap-2">
            <UiLabel>Phone</UiLabel>
            <UiInput type="tel" placeholder="Optional" />
          </div>
          <div class="flex flex-col gap-2">
            <UiLabel>Message</UiLabel>
            <UiTextarea placeholder="How can we help?" />
          </div>
          <UiButton class="w-full mt-2" type="button">
            Submit
          </UiButton>
        </form>
      </UiContactCard>
    </div>
  </section>
</template>
