<script setup lang="ts">
interface Sponsor {
  id: number
  name: string
  logoUrl?: string | null
  websiteUrl?: string | null
  tier: string
}
const props = defineProps<{ sponsors: Sponsor[] }>()

// Group by tier, preserving first-seen order. Each tier holds many sponsors.
const groups = computed(() => {
  const order: string[] = []
  const map = new Map<string, Sponsor[]>()
  for (const s of props.sponsors) {
    const tier = s.tier || 'Partner'
    if (!map.has(tier)) { map.set(tier, []); order.push(tier) }
    map.get(tier)!.push(s)
  }
  return order.map((tier) => ({ tier, items: map.get(tier)! }))
})
</script>

<template>
  <div class="space-y-10">
    <div v-for="g in groups" :key="g.tier">
      <div class="flex items-center gap-4">
        <span class="text-xs font-bold uppercase tracking-[0.2em] text-ink-faint">{{ g.tier }}</span>
        <span class="h-px flex-1 bg-line" />
      </div>

      <div class="mt-5 grid gap-4" style="grid-template-columns: repeat(auto-fill, minmax(180px, 1fr))">
        <component
          :is="s.websiteUrl ? 'a' : 'div'"
          v-for="s in g.items"
          :key="s.id"
          :href="s.websiteUrl || undefined"
          :target="s.websiteUrl ? '_blank' : undefined"
          :rel="s.websiteUrl ? 'noopener' : undefined"
          class="card card-hover group flex flex-col items-center gap-3 p-6 text-center"
          :title="s.name"
        >
          <div class="flex h-14 w-full items-center justify-center">
            <img
              v-if="s.logoUrl"
              :src="s.logoUrl"
              :alt="s.name"
              loading="lazy"
              class="max-h-14 w-auto max-w-[140px] object-contain"
            />
            <span v-else class="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-lg font-extrabold text-brand-600">
              {{ s.name.charAt(0) }}
            </span>
          </div>
          <span class="font-bold tracking-tight text-ink transition-colors group-hover:text-brand-600">{{ s.name }}</span>
          <span v-if="s.websiteUrl" class="flex items-center gap-1 text-xs font-semibold text-ink-faint">
            Visit <Icon name="lucide:external-link" class="text-[0.85em]" />
          </span>
        </component>
      </div>
    </div>
  </div>
</template>
