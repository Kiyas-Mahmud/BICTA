import { releaseDueDecisions } from '../utils/decisions'

// Cloudflare Cron Trigger entry point.
//
// The cloudflare-module preset exports a `scheduled` handler that fires this
// hook, so the cron in wrangler.jsonc lands here. Its only job is to release
// selection results whose announcement date has arrived — releaseDueDecisions
// is idempotent (decisionNotifiedAt is the sent-marker), so a missed or
// repeated run is harmless.
//
// The Application Center also calls it on load, deliberately: that is the
// safety net if a cron run is ever missed, and the reason results are never
// stranded behind a scheduler this app does not control.
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('cloudflare:scheduled', async () => {
    try {
      const sent = await releaseDueDecisions()
      if (sent) console.info(`[cron] announced ${sent} decision${sent === 1 ? '' : 's'}`)
    } catch (err: any) {
      console.error(`[cron] decision sweep failed: ${err?.message ?? err}`)
    }
  })
})
