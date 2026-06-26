<script setup lang="ts">
const logos = [
  {
    src: "https://svgl.app/library/nvidia-wordmark-light.svg",
    alt: "Nvidia Logo",
  },
  {
    src: "https://svgl.app/library/supabase_wordmark_light.svg",
    alt: "Supabase Logo",
  },
  {
    src: "https://svgl.app/library/openai_wordmark_light.svg",
    alt: "OpenAI Logo",
  },
  {
    src: "https://svgl.app/library/turso-wordmark-light.svg",
    alt: "Turso Logo",
  },
  {
    src: "https://svgl.app/library/vercel_wordmark.svg",
    alt: "Vercel Logo",
  },
  {
    src: "https://svgl.app/library/github_wordmark_light.svg",
    alt: "GitHub Logo",
  },
  {
    src: "https://svgl.app/library/claude-ai-wordmark-icon_light.svg",
    alt: "Claude AI Logo",
  },
  {
    src: "https://svgl.app/library/clerk-wordmark-light.svg",
    alt: "Clerk Logo",
  },
];

const copies = 3;
</script>

<template>
  <div class="relative w-full py-16">
    <div
      aria-hidden="true"
      class="-z-10 -top-1/2 -translate-x-1/2 pointer-events-none absolute left-1/2 h-[120vmin] w-[120vmin] rounded-b-full bg-[radial-gradient(ellipse_at_center,rgba(var(--color-foreground,0,0,0),0.1),transparent_50%)] blur-[30px]"
    />

    <section class="relative mx-auto max-w-5xl">
      <h2 class="mb-5 text-center font-medium text-foreground text-xl tracking-tight md:text-3xl">
        <span class="font-semibold text-ink">Our Sponsors</span>
      </h2>
      
      <div class="mx-auto my-5 h-px max-w-sm bg-line [mask-image:linear-gradient(to_right,transparent,black,transparent)]" />

      <div class="marquee mt-10 mb-10">
        <div class="marquee-track">
          <div 
            v-for="(logo, idx) in Array.from({ length: copies }).flatMap(() => logos)" 
            :key="idx" 
            class="flex w-40 shrink-0 items-center justify-center"
            :aria-hidden="idx >= logos.length ? 'true' : undefined"
          >
            <img 
              :src="logo.src" 
              :alt="logo.alt" 
              class="h-8 md:h-10 max-w-[140px] object-contain opacity-70 grayscale transition-all hover:opacity-100 hover:grayscale-0" 
            />
          </div>
        </div>
      </div>

      <div class="mx-auto mt-5 h-px max-w-4xl bg-line [mask-image:linear-gradient(to_right,transparent,black,transparent)]" />
    </section>
  </div>
</template>

<style scoped>
.marquee {
  overflow: hidden;
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent);
  mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent);
}
.marquee-track {
  display: flex;
  gap: 3rem;
  width: max-content;
  animation: marquee 35s linear infinite;
}
.marquee:hover .marquee-track {
  animation-play-state: paused;
}
@keyframes marquee {
  from { transform: translateX(0); }
  to { transform: translateX(calc(-100% / 3)); }
}
@media (prefers-reduced-motion: reduce) {
  .marquee {
    overflow-x: auto;
    -webkit-mask-image: none;
    mask-image: none;
  }
  .marquee-track {
    animation: none;
  }
}
</style>
