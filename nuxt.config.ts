export default defineNuxtConfig({
  compatibilityDate: '2026-06-11',
  devtools: { enabled: false },

  modules: ['@nuxtjs/tailwindcss', '@nuxt/fonts', '@nuxt/icon', 'nuxt-auth-utils', '@vueuse/motion/nuxt'],

  // One session config covers all three account types (admin/volunteer share
  // the sealed cookie shape, participants use a separate session key). With no
  // maxAge the sealed cookie never expires on its own — a stolen or
  // shared-device session stays valid indefinitely. 30 days balances that
  // against not logging a participant out mid-event.
  runtimeConfig: {
    session: {
      maxAge: 60 * 60 * 24 * 30,
    },
  },

  // Cloudflare Workers is the deploy target: D1 for the database, R2 for uploads.
  // `nitro-cloudflare-dev` runs the same bindings locally (miniflare) during
  // `nuxt dev`, so dev and production hit identical APIs.
  nitro: {
    preset: 'cloudflare_module',
    modules: ['nitro-cloudflare-dev'],
    // Lets useDb() reach the request's D1 binding without threading `event`
    // through every query helper.
    experimental: { asyncContext: true },
    routeRules: {
      // Uploads are streamed out of R2 by server/routes/uploads/[key].get.ts.
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
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'BICTA — the annual technology competition. Project Showcase, Datathon, Hackathon and more.' },
      ],
      // titleTemplate and the favicon link are set in app/app.vue instead:
      // both depend on the admin-configured brand name and primary logo, which
      // this static config cannot read. Declaring them here as well would
      // leave two competing sources and a duplicate <link rel="icon">.
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

})
