# BICTA — Implementation Plan

Step-by-step build order and status. References: [Project_Plan.md](Project_Plan.md), [Architecture_Plan.md](Architecture_Plan.md), [Security_Plan.md](Security_Plan.md).

**Overall status: Phases 1–3 shipped and expanded well beyond original scope; Phase 4 mostly done; Phase 5 partially done (deployed to Render, Postgres/S3 not wired).** See §6 for what's actually left.

---

## Phase 1 — Scaffold & Foundation ✅ DONE

- [x] Nuxt 4 + TypeScript, git, `.gitignore`
- [x] Tailwind, Drizzle ORM, better-sqlite3, Zod, nuxt-auth-utils, bcryptjs, sanitize-html, `@nuxt/icon` (Lucide), `@vueuse/motion`, Swiper
- [x] `nuxt.config.ts`, Tailwind tokens (`brand.*`, `ink.*`, `line`, `mist.*`), `.env.example`
- [x] `server/database/schema.ts` — now **18 tables** (grew well past the original 8: events, competitions, prizes, registrations, news, gallery_images, admins, site_settings, home_features, timeline_milestones, sponsors, people, winners, faqs, newsletter_subscribers, testimonials, how_it_works_steps, contact_messages)
- [x] `server/database/client.ts` — SQLite only; Postgres branch **not implemented**, just commented as a future switch point (see §6)
- [x] `scripts/seed.ts` — admin from env + full demo dataset (events, competitions, prizes, news, features, timeline, sponsors, people, winners, faqs, testimonials, how-it-works steps, gallery images)
- [x] Auth: rate limiter, login/logout, `requireAdmin`, admin middleware, login page + admin shell

**Checkpoint verified:** login works, unauthenticated `/api/admin/*` returns 401.

---

## Phase 2 — Admin CRUD ✅ DONE (scope grew significantly)

- [x] Shared admin components: `Collection.vue` (generic field-config-driven list/edit screen) + `server/utils/crud.ts` factory — new pattern that replaced the originally-planned one-off DataTable/FormField per entity
- [x] Upload endpoint — magic-byte check for JPEG/PNG/WebP **and SVG** (sanitized), 5 MB cap, UUID filenames
- [x] Events (CRUD + set-current transaction), Competitions (CRUD + prizes inline editor), Registrations (list/filter/status/CSV export), News (CRUD + draft/publish), Gallery, Settings, Account — all original-scope items done
- [x] **Beyond original scope**, all with full CRUD + admin screens: Home Features (Why Join), Timeline Milestones, Sponsors, People (judges/speakers), Winners, FAQs, Newsletter subscribers (list + CSV export), Testimonials, How It Works steps, Contact Messages (inbox with read toggle)
- [x] Dashboard with entity counts + current event card

**Checkpoint verified:** full event lifecycle creatable through UI; cascade deletes confirmed (events → competitions → prizes/registrations; events → gallery).

---

## Phase 3 — Public Site ✅ DONE (redesigned twice, consolidated once)

- [x] Query utilities in `server/utils/queries.ts` + `server/utils/hackathon.ts` (DTO mapper)
- [x] Layout + design tokens — **note:** the design system was built, then fully replaced (achromatic glass → light blue-accent per user reference), then unified again after merging a second contributor's parallel UI work (`ui-polish` cleanup, 2026-07)
- [x] Home page — **grew from a 6-section page to 15 sections**, all DB-driven: hero (photo collage + floating stat chips), countdown + stats, why join, competitions carousel, timeline, sponsors, judges/speakers marquee, how-it-works, gallery, news (editorial featured + list layout), winners, testimonials, FAQ + venue, contact form, newsletter
- [x] **Canonical event route is `/events/[id]`** (not `/competitions/[slug]` as originally planned) — real prize rows, real registration counts, shared PersonCard/SponsorWall/FaqAccordion components
- [x] `/competitions/[slug]` and `/competitions/[slug]/register` kept as 301 redirects to `/events/[id]` for any old links
- [x] Registration form + `POST /api/registrations` — rate limit, honeypot, time-trap, Zod, window/duplicate checks — all verified
- [x] `/news` + `/news/[slug]`, `/events` + `/events/[id]`, `/gallery`, `/contact` (working form → `POST /api/contact`, a second hardened public endpoint), `/privacy`, `/terms` (settings-backed)
- [x] 404/error page matching design

**Checkpoint verified:** admin edits reflect on public pages immediately; registration/newsletter/contact all tested end-to-end including anti-spam paths (honeypot, time-trap, rate limit 429).

---

## Phase 4 — Polish — MOSTLY DONE

- [x] `SectionReveal` scroll-in animation, card hover lift, page transitions, `prefers-reduced-motion` guards throughout
- [x] `useSeoMeta` per page (title/description/OG image)
- [x] Security headers via Nitro `routeRules` (nosniff, frame-deny, referrer-policy, CSP on `/uploads/**`)
- [x] `NuxtLoadingIndicator`, `img loading="lazy"` on gallery/card images
- [ ] **`sitemap.xml` / `robots.txt`** — not started, no files exist yet
- [ ] **Lighthouse pass** — never formally run; no confirmed performance/accessibility score
- [ ] **Systematic responsive QA** — spot-checked during builds at various points, not swept at fixed 360/768/1280 breakpoints per page

---

## Phase 5 — Deploy Prep — PARTIALLY DONE

- [x] `npm run build` + prod smoke test — done repeatedly, including a from-scratch build (deleted `.nuxt`/`.output`) to catch environment-specific issues
- [x] README — full setup, database, troubleshooting, admin guide
- [x] **Render Blueprint** (`render.yaml`) — not in the original plan; added for a one-click free-tier deploy. Fixed through several real build failures: missing `.data` dir before migrate, `NODE_ENV=production` silently skipping devDependencies, and an unrelated `@nuxt/fonts` provider (`fontshare`) crashing the build. Deploy verification with the user is in progress as of the latest push.
- [ ] **Persistent storage decision** — Render free tier has no disk; SQLite DB and uploaded images reset on every restart/redeploy. Fine for a demo, **not for real yearly-competition data**. This is the single biggest gap before real launch (see §6).
- [ ] Postgres switch — still just a comment in `client.ts`, never implemented
- [ ] S3-compatible upload swap — not needed unless serverless hosting is chosen; not started
- [ ] Formal run-through of the Security Checklist in Security_Plan.md §10 (individual items have been verified ad hoc — anti-spam, sanitization, headers — but never checked off as a single pass)

---

## 6. What's actually left — prioritized backlog

### Priority 1 — blocks real (non-demo) use
1. **Decide persistent storage** and implement it: either (a) upgrade the Render service to Starter + a small persistent disk (~$7-8/mo total, no code changes needed — symlink `.data`/`public/uploads` to the disk at boot), or (b) do the Postgres + S3-compatible-storage swap for a fully serverless-friendly setup (real code work: new `client.ts` branch, `drizzle.config.ts` dialect switch, upload endpoint rewrite). **Recommendation: (a)** — far less work, keeps the SQLite model that's already built and tested.
2. **Confirm the Render deploy is actually green end-to-end** (login, registration, admin CRUD all working on the live URL) — last few turns were fixing build failures one at a time; needs a final full pass.
3. **`sitemap.xml` + `robots.txt`** — quick win, needed before any real public launch/SEO.

### Priority 2 — quality bar before calling it "launched"
4. Lighthouse pass (performance/accessibility/SEO ≥ 90 target from the original plan) and fix whatever it flags.
5. Systematic responsive sweep — the target audience is students on phones (per PRODUCT.md); worth a deliberate pass at 360/768/1280.
6. Registration confirmation email — registrants currently get no email at all; admin has to manually tell them. Was noted as future scope in Project_Plan.md; worth reconsidering now given the form is the primary conversion path.
7. Contact Messages CSV export (Registrations and Newsletter already have it; Contact doesn't — minor parity gap).

### Priority 3 — nice-to-have / defer until needed
8. Automated tests — currently zero (no unit/e2e coverage anywhere in the repo).
9. Backup automation (README documents the manual procedure; no script exists).
10. Admin "forgot password" flow (currently: change password only, requires being logged in already).
11. Custom domain on Render (currently `.onrender.com`).
12. Multi-admin roles (all admins are currently equal; fine unless the org grows).

---

## Build Order Rationale (historical, still accurate)

Auth before CRUD (every API needs `requireAdmin`). Admin before public site (public pages needed real data to design against). Upload endpoint early (events/news forms depend on it). Polish after content pages existed. Security controls built inline per phase, not bolted on at the end.

## Risks & Mitigations

| Risk | Status |
|---|---|
| Rich text editor scope creep | Held the line — Tiptap starter kit only, no tables/embeds |
| Hosting decision blocks uploads design | Still open — see Priority 1 above |
| `is_current` race / multiple current events | Mitigated — single transaction endpoint |
| Registration spam | Mitigated — rate limit + honeypot + time-trap, verified on all 3 public write endpoints |
| PII mishandling | Mitigated — admin-only access, no bodies in logs, CSV escaping |
| Seed credentials reach production | Mitigated — seed refuses default/weak password when `NODE_ENV=production` |
| Free-tier hosting has no persistent storage | **Open** — flagged to user, decision pending (Priority 1) |
