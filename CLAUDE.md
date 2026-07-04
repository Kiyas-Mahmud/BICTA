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
- **Drizzle ORM**; SQLite dev (`.data/bicta.db`), Postgres when `DATABASE_URL` set — driver switch only in `server/database/client.ts`
- **nuxt-auth-utils** sealed session cookies, admin-only auth (participants register via form, no accounts)
- **Zod** validation on every admin API payload
- **@vueuse/motion** for subtle animations; **sanitize-html** for rich text; **bcryptjs** for passwords
- Image uploads → `/public/uploads`, random UUID filenames (S3 swap only if serverless hosting chosen)

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

## Commands (once scaffolded)

```bash
npm run dev          # dev server
npm run seed         # admin user (from env) + sample data
npx drizzle-kit generate && npx drizzle-kit migrate   # schema changes
npm run build && node .output/server/index.mjs        # prod smoke test
```

## Environment

- `.env` (gitignored): `NUXT_SESSION_PASSWORD` (≥32 chars), `ADMIN_EMAIL`, `ADMIN_PASSWORD`, optional `DATABASE_URL`
- Hosting: deploying to **Render** (free tier) via `render.yaml` Blueprint. No persistent disk on free tier — SQLite DB + uploads reset on every restart/redeploy; fine for a demo, not for real data. Upgrading to Starter + a disk is the recommended path if/when real registrations need to persist (see Implementation_Plan.md §6).

## Status

- 2026-06-11: planning complete (4 plan docs). Requirement change same day: built-in registration form (no Google Forms), docs updated.
- 2026-06-11: **Phases 1–3 implemented and verified.**
- 2026-06 to 2026-07: major expansion beyond original scope — home page grew to 15 DB-driven sections (sponsors, judges, timeline, testimonials, how-it-works, etc.), design system rebuilt twice (achromatic glass → light blue-accent), merged a second contributor's parallel UI work and consolidated the resulting duplication (`ui-polish` branch → `main`), canonical event route moved to `/events/[id]`, added `POST /api/contact` as a third hardened public endpoint.
- 2026-07-02/03: first Render deployment attempt — hit and fixed three real build failures in sequence (missing `.data` dir before migrate, `NODE_ENV=production` skipping devDependencies, `@nuxt/fonts` provider crash). Deploy verification in progress.
- See `docs/Implementation_Plan.md` §6 for the current prioritized backlog (persistent storage decision is the top open item).
- Gotchas: dev server must be stopped before `npm run build` (.nuxt contention). If build fails with "Cannot find native binding" (rolldown), run `npm install --no-save @rolldown/binding-win32-x64-msvc@<rolldown version>` — npm optional-deps bug. Session cookie is `Secure`; curl-style testing over http needs manual Cookie header replay.
