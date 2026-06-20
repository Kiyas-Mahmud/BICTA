# BICTA — Implementation Plan

Step-by-step build order. Each phase ends with a working, verifiable state. References: [Project_Plan.md](Project_Plan.md), [Architecture_Plan.md](Architecture_Plan.md), [Security_Plan.md](Security_Plan.md).

---

## Phase 1 — Scaffold & Foundation

**Goal:** running app, database with schema, seeded data, working admin login.

### 1.1 Project setup
- [ ] `npx nuxi init` (Nuxt 4, TypeScript), git init, `.gitignore` (`.env`, `.data/`, `public/uploads/*`)
- [ ] Install: `@nuxtjs/tailwindcss`, `drizzle-orm`, `drizzle-kit`, `better-sqlite3`, `zod`, `nuxt-auth-utils`, `bcryptjs`, `sanitize-html`, `@vueuse/motion`
- [ ] `nuxt.config.ts`: modules, runtimeConfig (`sessionPassword`, `databaseUrl`), app head defaults (title template, lang)
- [ ] Tailwind config: accent color token, font (Inter via `@nuxt/fonts` or fontsource), container defaults
- [ ] `.env.example` with all required vars

### 1.2 Database
- [ ] `server/database/schema.ts` — all 8 tables (events, competitions, prizes, **registrations**, news, gallery_images, admins, site_settings) with FKs + cascade deletes + unique `(competition_id, email)` on registrations
- [ ] `server/database/client.ts` — SQLite default, Postgres if `DATABASE_URL` set
- [ ] `drizzle.config.ts`; generate + run first migration
- [ ] `scripts/seed.ts` — admin from env (refuse weak/default password in production), 2 sample events (1 current, 1 past), 3 competitions with prizes, 2 news items; `npm run seed`

### 1.3 Auth
- [ ] `server/utils/rateLimit.ts` — shared limiter (used by login now; registrations + upload later)
- [ ] `server/api/admin/auth/login.post.ts` — Zod validate, bcrypt compare, rate limit (5/15min/IP), set session
- [ ] `server/api/admin/auth/logout.post.ts`
- [ ] `server/utils/requireAdmin.ts` — throws 401 if no admin session
- [ ] `app/middleware/admin.ts` — redirect unauthenticated to `/admin/login`
- [ ] `app/pages/admin/login.vue` + `app/layouts/admin.vue` (sidebar shell)

**✅ Checkpoint:** `npm run dev` → log in at `/admin/login` → see empty dashboard → logout works. Direct `POST /api/admin/events` without session returns 401.

---

## Phase 2 — Admin CRUD

**Goal:** all content manageable from admin. Build shared pieces first, then entity screens (each follows the same pattern — fastest order below).

### 2.1 Shared admin components
- [ ] `ui/`: Button, Input, Textarea, Select, Modal, Badge
- [ ] `admin/`: DataTable (list + actions), FormField wrapper, ConfirmDialog, ImageUploader, simple RichTextEditor (e.g. Tiptap starter kit), useToast composable

### 2.2 Upload endpoint
- [ ] `server/api/admin/upload.post.ts` — magic-byte type check (jpeg/png/webp), 5 MB cap, `crypto.randomUUID()` filename, write to `public/uploads/`, return URL (Security Plan §6)

### 2.3 Entity APIs + screens (repeat pattern: Zod schema → API routes → list page → form page)
- [ ] **Events** — CRUD + `set-current` endpoint (transaction: clear flag, set one). Screens: list, new, edit
- [ ] **Competitions** — CRUD nested under event (edit screen reached from event page); rich text description/rules (sanitize on write); registration open/close + deadline + team settings; sort order
- [ ] **Prizes** — inline editor inside competition form (add/remove rows, position, amount, note); saved with competition or via own endpoints
- [ ] **Registrations (admin side)** — `index.get` (list w/ competition + status filters), `[id].put` (status change), `export.get` (CSV w/ formula-injection escaping); screen with DataTable, detail view, count badges
- [ ] **News** — CRUD + status toggle (draft/published, sets `published_at`); list filter by status
- [ ] **Gallery** — per-event multi-upload, captions, reorder, delete
- [ ] **Settings** — single form, key/value upsert (`settings.put.ts`)
- [ ] **Account** — change password (requires current password)
- [ ] Dashboard — entity counts, current event card, quick links

**✅ Checkpoint:** create full fake event with 3 competitions + prizes + news + gallery photos entirely through UI; insert fake registrations via script and confirm list/filter/status/CSV work. Delete event → cascades confirmed (incl. registrations).

---

## Phase 3 — Public Site

**Goal:** all public pages rendering live DB content.

### 3.1 Query utilities (`server/utils/queries/`)
- [ ] `getCurrentEvent()` (with competitions + prize totals), `getCompetitionBySlug()`, `getPublishedNews(limit?, page?)`, `getNewsBySlug()`, `getPastEvents()`, `getEventBySlug()` (with competitions, gallery), `getSettings()`

### 3.2 Layout & tokens
- [ ] `layouts/default.vue` — header (logo, nav, mobile menu), footer (contact/socials from settings)
- [ ] Typography/spacing scale in `main.css` per design guidelines (white bg, `py-24` sections, max-w container)

### 3.3 Pages
- [ ] `/` Home — hero (current event, countdown), competitions grid (`CompetitionCard` w/ prize money), total prize pool stat, latest 3 news, past events strip. **Empty state:** no current event → "next edition coming soon" hero
- [ ] `/competitions/[slug]` — description, rules (sanitized `v-html`), `PrizeTable`, register button → `/competitions/[slug]/register` (hidden/disabled when closed or past deadline)
- [ ] `/competitions/[slug]/register` — registration form (name, email, phone, institution; team fields when `team_based`); client validation mirrors server Zod; success confirmation screen
- [ ] `POST /api/registrations` — public endpoint: rate limit → honeypot + time-trap → Zod → window/duplicate checks → insert (Security Plan §6a)
- [ ] `/news` (pagination) + `/news/[slug]`
- [ ] `/events` archive + `/events/[slug]` (details, competitions held, `GalleryGrid`)
- [ ] 404 + error page matching design

**✅ Checkpoint:** edit content in admin → refresh public page → change visible. Register via the public form → appears in admin Registrations instantly; closed/deadline/duplicate submissions rejected (test with curl too). All routes render with seed data and with empty DB.

---

## Phase 4 — Polish

- [ ] `SectionReveal` component — `@vueuse/motion` fade + 16px slide-up, once, ~400ms; wrap home/detail sections
- [ ] Card hover lift (~150ms), page transition fade, `prefers-reduced-motion` guard on all motion
- [ ] Responsive pass: 360px / 768px / 1280px on every page; competitions grid 1→2→3 cols
- [ ] SEO: `useSeoMeta` per page (title, description, OG image from event/news cover), `sitemap.xml`, `robots.txt`, canonical URLs
- [ ] Security headers via Nitro routeRules (CSP, nosniff, frame deny — Security Plan §5)
- [ ] Loading states (skeletons on payload navigation), image `loading="lazy"` + width/height to stop CLS
- [ ] Lighthouse pass: ≥90 performance/SEO/accessibility on home

**✅ Checkpoint:** full click-through on mobile + desktop; Lighthouse targets met; reduced-motion verified.

---

## Phase 5 — Deploy Prep

- [ ] `npm run build` + `node .output/server/index.mjs` production smoke test
- [ ] Postgres switch verified once locally (set `DATABASE_URL`, run migrations, app boots)
- [ ] Run full **Security Checklist** from [Security_Plan.md](Security_Plan.md) §10
- [ ] README: setup, env vars, seed, admin guide (how to launch a new year's event), deployment recipes (VPS/Docker + serverless note re: uploads→S3), backup/restore steps
- [ ] If serverless hosting chosen: swap upload storage to S3-compatible (single module change per Architecture Plan §3 flow)

**✅ Done definition:** fresh clone → `.env` → install → migrate → seed → build → serve = working site; admin can run an entire yearly event cycle — including opening registration and exporting participants — without developer help.

---

## Build Order Rationale

Auth before CRUD (every API needs `requireAdmin`). Admin before public site (public pages need real data to design against). Upload endpoint early in Phase 2 (events/news forms depend on it). Polish after content pages exist (animations applied to real sections). Security controls built inline per phase, verified as a gate in Phase 5 — not bolted on at the end.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Rich text editor scope creep | Tiptap starter kit only (bold/italic/headings/lists/links); no tables/embeds in v1 |
| Hosting decision blocks uploads design | Storage isolated in one util; local-disk default, S3 swap is Phase 5 task |
| `is_current` race / multiple current events | Single transaction endpoint; DB-level partial unique index where supported |
| Registration spam floods DB | Rate limit + honeypot + time-trap from day one; Turnstile wire point ready if needed |
| PII mishandling | Registrations admin-only, no bodies in logs, CSV escaping, retention policy in README (Security Plan §6b) |
| Seed credentials reach production | Seed refuses default/weak password when `NODE_ENV=production` |
