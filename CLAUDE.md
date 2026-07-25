# BICTA — Project Memory

Yearly competition event website. Public site with **built-in participant registration form** (no participant accounts) + custom admin UI. All content (events, competitions, prizes, news, gallery) editable from admin; registrations viewable/exportable from admin — no code changes between yearly editions.

## Plan Documents (read before major work)

- [Project_Plan.md](Project_Plan.md) — goals, data model, sitemap, design guidelines, phases
- [Architecture_Plan.md](Architecture_Plan.md) — directory structure, flows, data layer, deployment options
- [Security_Plan.md](Security_Plan.md) — threat model, auth/session rules, sanitization, upload controls, pre-launch checklist
- [Implementation_Plan.md](Implementation_Plan.md) — step-by-step build order with checkpoints
- `Bicta_Plan.md` — empty leftover, ignore/delete

## Stack (decided — do not substitute)

- **Nuxt 4 + TypeScript (strict)**, Tailwind CSS
- **Runs on Cloudflare Workers** (`nitro.preset: 'cloudflare_module'`). `nitro-cloudflare-dev` gives `nuxt dev` the same bindings via miniflare. Config + bindings live in `wrangler.jsonc`.
- **Drizzle ORM on Cloudflare D1** (database `bicta`, binding `DB`) — driver switch only in `server/database/client.ts`. D1 is **async-only**: every query is awaited, and `db.batch([...])` replaces `db.transaction()` (D1 has no interactive transactions).
- **nuxt-auth-utils** sealed session cookies, admin-only auth (participants register via form, no accounts)
- **Zod** validation on every admin API payload
- **@vueuse/motion** for subtle animations; **sanitize-html** for rich text; **bcryptjs** for passwords
- Image uploads → **R2 bucket `bicta-uploads`** (binding `UPLOADS`, keys `uploads/<uuid>.<ext>`), served back through `server/routes/uploads/[key].get.ts` so the strict CSP/cache route rules still apply. The bucket stays private.
- **Workers-safe deps only:** mail goes out via Resend's REST API with plain `fetch` (the `resend` SDK pulls `@react-email/render`, unbundlable); QR PNGs come from `uqr` + a hand-rolled 1-bit PNG encoder in `server/utils/qr.ts` (`qrcode`/`pngjs` call `util.inherits` on Node stream prototypes and crash workerd at startup). Do not reintroduce either package.

## Conventions

- Admin write route skeleton, always in this order: `requireAdmin(event)` → Zod parse → Drizzle op → return row. Never skip `requireAdmin`.
- **Public write endpoints:** `POST /api/registrations`, `POST /api/newsletter`, `POST /api/contact`, plus participant auth (`/api/participant/{login,set-password,forgot,reset}`) — all rate-limited; form-facing ones add honeypot/time-trap; auth ones use the constant-time / anti-enumeration pattern from admin login. Any new public write endpoint requires explicit security review.
- **Three account types, all bcrypt + nuxt-auth-utils sealed cookies:** admins (`session.user`, role `admin`), volunteers (same `admins` table, role `volunteer`, scanner-only), participants (`participant_accounts`, `session.participant`). Guards: `requireAdmin` (role admin), `requireStaff` (admin|volunteer, only `/api/staff/**`), `requireParticipant` (`/api/participant/**`). Participant and staff sessions are separate keys — a participant can never satisfy requireAdmin.
- **Participant portal + QR check-in module:** registration creates participant accounts (leader active w/ chosen password; members `invited` + emailed a set-password link + personal QR). Tables: `participant_accounts`, `team_members` (roster source of truth; legacy `registrations.team_members` JSON kept synced via `server/utils/team.ts`), `checkpoints` (per current event), `checkins` (unique `(accountId, checkpointId)` = one-collection guard). Portal at `/portal/*` (leader edits roster until deadline, members read-only — enforced server-side in `requireTeamLeader`). Volunteers scan at `/staff/scan`. Email via `server/utils/email.ts` (Resend when `RESEND_API_KEY` set, else logs to console); QR via `server/utils/qr.ts` (opaque `checkinToken`, no PII).
- **Canonical event route is `/events/[id]`** (id = competition id, served by `useEvents` state fed from `/api/public/hackathon-events`). `/competitions/[slug]` routes are 301 redirects only. Home-page sections are consolidated one-per-concern and all DB-backed (2026-07 `ui-polish` cleanup): timeline/judges/gallery/testimonials/how-it-works/news all come from the `/api/public/home` payload — never hardcode section content in pages.
- `Ui{Button,Input,Textarea,Label}` are thin wrappers over the `main.css` token classes (`btn-primary`, `btn-secondary`, `field`, `label`); use them or the raw classes, nothing hand-rolled. Status colors via `badge-{green,blue,gray,amber,...}` / `pill-open|closed`; form errors via `.form-error`. No raw Tailwind palette colors (`slate-*`, `emerald-*`, `blue-600`, hex) in pages/components.
- Home page is fully DB-driven: tables `home_features` (Why Join), `timeline_milestones` (per current event), `sponsors`, `people` (judge/speaker), `winners`, `faqs`, `newsletter_subscribers`, `testimonials`, `how_it_works_steps`, `contact_messages` (admin > Messages); section headings/visibility/venue/legal text live in `site_settings` keys. Section order is fixed in `app/pages/index.vue`; each section auto-hides when empty or when `section_<name>_visible='0'`.
- Simple admin list screens share `app/components/admin/Collection.vue` (field-config driven) + `server/utils/crud.ts` factory (`listHandler`/`createHandler`/`updateHandler`/`deleteHandler`). Add a new list section by: schema table → Zod schema → 4 one-line route files → a thin admin page passing a field config.
- Registration data is untrusted + PII: default Vue escaping in admin (never `v-html`), CSV export escapes `= + - @`, no registration bodies in logs, never in public SSR payloads.
- Public pages read via server query utils in `server/utils/queries/` + `useAsyncData`.
- Rich text: sanitize server-side **on write**; `v-html` allowed only for sanitized rich-text fields.
- Slugs: server-generated, unique per table. Dates: UTC ISO in DB.
- Exactly one event has `is_current = true` — change it only via the set-current transaction endpoint.
- Cascade deletes: event → competitions → prizes/registrations, event → gallery_images.
- Registrations: unique `(competition_id, email)`; accepted only while `registration_open` and before `registration_deadline` — enforced server-side.
- No Pinia unless admin complexity forces it. No raw SQL.

## Design Rules (public site)

- **Light professional, blue-accent** system (redesigned 2026-06-14 to match a user reference; the earlier achromatic-glass system is retired). White background, **brand blue** primary (`brand-600` #2563eb), soft white cards, pastel icon tiles. Defined in `PRODUCT.md` + `DESIGN.md` — read before any public-UI work.
- Tokens in `tailwind.config.ts`: `brand.50–900` (blue), `ink`/`ink-soft`/`ink-faint`, `line`, `mist.1/2`. `accent` aliases to brand blue so admin classes keep working.
- Reusable classes in `main.css`: `card`(+`card-hover`), `glass-bar` (sticky nav), `btn-primary` (blue) / `btn-secondary` (white), `field` (inputs), `badge`+`badge-{blue,green,orange,purple}`, `pill-open`/`pill-closed` + `dot-live`, `tile`+`tile-{blue,purple,green,orange,pink,cyan}` (pastel icon tiles), `back-btn`, `eyebrow`, `link-underline`.
- **Icons:** `@nuxt/icon` with Lucide bundled locally (`<Icon name="lucide:..." />`). No emoji in UI. Favicon at `public/favicon.svg`.
- Every sub-page starts with `<SiteBackButton>` (history back, falls back to a `to` prop / home).
- Font: Schibsted Grotesk. Type classes `text-display` / `text-title`. No em dashes in UI copy.
- Motion: hovers ~200ms, reveals ~500ms (`SiteSectionReveal`, supports `:delay`), hero `.rise` entrance, `.floating` + `.float-blob` ambient float, `.img-zoom` on card images, top `NuxtLoadingIndicator`. All disabled under `prefers-reduced-motion`.
- Home section order (fixed, in `app/pages/index.vue`): hero → countdown+stats → why → competitions → timeline → partners → judges → gallery → news → winners → faq+venue → newsletter. Sub-page nav: `/gallery`, `/contact` are standalone pages.

## Commands

```bash
npm run dev              # nuxt dev, with local D1 + R2 via miniflare
npm run build            # build for the Workers runtime
npm run preview          # wrangler dev on the built output (real workerd)
npm run deploy           # build + wrangler deploy

npm run db:generate      # drizzle-kit generate (schema.ts -> .sql migration)
npm run db:migrate       # apply migrations to local D1
npm run db:migrate:remote# apply migrations to the real D1

npm run seed             # seed local D1 (skips if it already has events; --force overrides)
npm run seed:remote      # same, against the real D1
```

## Environment

- **Local:** `.env` (tsx scripts) + `.dev.vars` (Worker runtime) — both gitignored, same keys: `NUXT_SESSION_PASSWORD` (≥32 chars), `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `RESEND_API_KEY`, `MAIL_FROM`, `PUBLIC_SITE_URL`.
- **Production:** the same keys are Worker secrets — `wrangler secret put <NAME>`. Never put them in `wrangler.jsonc`.
- **Cloudflare account** `84b7bedd8060dc229ccd7f1e9ccb8347`. D1 `bicta` = `78b3f77f-f4de-4ebc-b0c5-2a620f32c24e` (APAC). R2 `bicta-uploads`. S3 API endpoint (only if something outside the Worker needs it): `https://84b7bedd8060dc229ccd7f1e9ccb8347.r2.cloudflarestorage.com`.
- Data survives deploys now — D1 and R2 are durable, unlike the old Render free-tier filesystem.

## Status

- 2026-06-11: planning complete (4 plan docs). Requirement change same day: built-in registration form (no Google Forms), docs updated.
- 2026-06-11: **Phases 1–3 implemented and verified.**
- 2026-06 to 2026-07: major expansion beyond original scope — home page grew to 15 DB-driven sections (sponsors, judges, timeline, testimonials, how-it-works, etc.), design system rebuilt twice (achromatic glass → light blue-accent), merged a second contributor's parallel UI work and consolidated the resulting duplication (`ui-polish` branch → `main`), canonical event route moved to `/events/[id]`, added `POST /api/contact` as a third hardened public endpoint.
- 2026-07-02/03: first Render deployment attempt — hit and fixed three real build failures in sequence (missing `.data` dir before migrate, `NODE_ENV=production` skipping devDependencies, `@nuxt/fonts` provider crash).
- 2026-07-26: **admin + volunteer consoles redesigned** (shared console design system in `main.css`, `Admin*` primitives, toast/confirm composables, staff scanner shell).
- 2026-07-26: **migrated off Render/SQLite to Cloudflare Workers + D1 + R2.** `render.yaml` deleted. Every Drizzle call awaited, 4 transactions became `db.batch()`, uploads moved to R2 behind a Worker route, `resend`/`qrcode` swapped for fetch + `uqr`. Verified end to end on `wrangler dev`: public pages, admin login/pages, R2 upload round-trip (byte-identical, CSP headers intact), batch writes, registration flow with account provisioning, QR PNG.
- See `docs/Implementation_Plan.md` §6 for the current prioritized backlog.
- Gotchas: dev server must be stopped before `npm run build` (.nuxt contention) — on Windows a running `wrangler dev` also locks `.output/public`, kill it first. If build fails with "Cannot find native binding" (rolldown), run `npm install --no-save @rolldown/binding-win32-x64-msvc@<rolldown version>` — npm optional-deps bug, and **every `npm install`/`uninstall` drops it again**. Session cookie is `Secure`; curl-style testing over http needs manual Cookie header replay. D1 has no `db.transaction()` — use `db.batch()`, and remember batches cannot depend on ids generated inside the same batch.
