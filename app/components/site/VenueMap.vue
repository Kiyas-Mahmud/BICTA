<script setup lang="ts">
// `flat` drops the card chrome so this can sit inside another card (the
// contact panel) without the doubled border-and-shadow of a card in a card.
const props = defineProps<{ name?: string; address?: string; directions?: string; mapEmbed?: string; flat?: boolean }>()

// What admins paste varies: the iframe src from Share > Embed a map, a short
// share link (maps.app.goo.gl/...), a plain maps URL, or nothing at all. Only
// the first is embeddable — Google serves share and search links with
// X-Frame-Options: DENY, so putting one in an iframe renders a broken frame.
// Anything not embeddable is used for the "Open in Google Maps" button instead,
// and the frame falls back to a query built from the address.
//
// Google's "Embed a map" dialog shows the whole <iframe src="…"> tag to copy,
// and most people copy all of it rather than picking the src out by hand. If
// that happens, using the pasted value as-is makes the src attribute literally
// `<iframe src="https://…">`, which is not a URL — the map silently breaks.
// Pull the real URL out first so either form works.
const raw = computed(() => {
  const v = (props.mapEmbed ?? '').trim()
  const fromTag = v.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1]
  return (fromTag ?? v).trim()
})

const isEmbeddable = computed(() => {
  const v = raw.value
  if (!v) return false
  return v.includes('/maps/embed') || /[?&]output=embed\b/.test(v)
})

const query = computed(() => props.address || props.name || '')

const embedSrc = computed(() => {
  if (isEmbeddable.value) return raw.value

  // A full maps URL that carries a place query can be rewritten into one.
  const v = raw.value
  const q = v.match(/[?&]q=([^&]+)/)?.[1]
  if (q && /google\.[a-z.]+\/maps|maps\.google\./.test(v)) {
    return `https://www.google.com/maps?q=${q}&output=embed`
  }
  // A bare "lat,lng" pair also works as a query.
  if (/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(v)) {
    return `https://www.google.com/maps?q=${encodeURIComponent(v)}&output=embed`
  }

  return query.value ? `https://www.google.com/maps?q=${encodeURIComponent(query.value)}&output=embed` : ''
})

// Share links are perfect here even though they cannot be framed.
const externalUrl = computed(() => {
  if (raw.value && !isEmbeddable.value) return raw.value
  return query.value ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query.value)}` : ''
})
</script>

<template>
  <div class="overflow-hidden" :class="flat ? '' : 'card'">
    <div
      v-if="embedSrc"
      class="aspect-[16/10] w-full bg-mist-2"
      :class="flat ? 'overflow-hidden rounded-xl border border-line' : ''"
    >
      <iframe
        :src="embedSrc"
        class="h-full w-full"
        style="border: 0"
        loading="lazy"
        referrerpolicy="no-referrer-when-downgrade"
        title="Venue location map"
      />
    </div>
    <div class="flex items-start gap-3" :class="flat ? 'pt-5' : 'p-6'">
      <span class="tile tile-blue h-11 w-11 shrink-0 text-xl"><Icon name="lucide:map-pin" /></span>
      <div class="min-w-0">
        <h3 v-if="name" class="font-extrabold tracking-tight">{{ name }}</h3>
        <p v-if="address" class="mt-0.5 text-sm text-ink-soft">{{ address }}</p>
        <p v-if="directions" class="mt-2 text-sm text-ink-soft">{{ directions }}</p>
        <a
          v-if="externalUrl"
          :href="externalUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-brand-700 hover:underline"
        >
          <Icon name="lucide:external-link" /> Open in Google Maps
        </a>
      </div>
    </div>
  </div>
</template>
