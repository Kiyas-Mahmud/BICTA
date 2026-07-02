export default defineNuxtConfig({
  compatibilityDate: '2026-06-11',
  devtools: { enabled: false },

  modules: ['@nuxtjs/tailwindcss', '@nuxt/fonts', '@nuxt/icon', 'nuxt-auth-utils', '@vueuse/motion/nuxt'],

  css: ['~/assets/css/main.css'],

  // Bundle the Lucide collection server-side (no runtime fetch from Iconify API).
  icon: {
    serverBundle: 'local',
    class: 'bicta-icon',
  },

  fonts: {
    families: [{ name: 'Schibsted Grotesk', provider: 'google', weights: [400, 500, 700, 800] }],
    // Only Google is used; disable the rest so an unrelated provider's API
    // outage/format change can't break the build (fontshare did exactly
    // this during a Render build).
    providers: {
      fontshare: false,
      bunny: false,
      adobe: false,
      fontsource: false,
      googleicons: false,
      npm: false,
    },
  },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      titleTemplate: (title) => (title ? `${title} — BICTA` : 'BICTA — Annual Tech Competition'),
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'BICTA — the annual technology competition. Project Showcase, Datathon, Hackathon and more.' },
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    },
    pageTransition: { name: 'page', mode: 'out-in' },
  },

  routeRules: {
    '/**': {
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      },
    },
  },

  nitro: {
    routeRules: {
      '/uploads/**': {
        headers: {
          'Cache-Control': 'public, max-age=31536000, immutable',
          // Defense-in-depth for user-uploaded SVGs opened directly.
          'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src data:",
          'X-Content-Type-Options': 'nosniff',
        },
      },
    },
  },
})
