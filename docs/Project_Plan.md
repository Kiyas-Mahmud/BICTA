# BICTA Competition Website — Project Plan

## 1. Overview

BICTA is a yearly competition event. Each edition (year) hosts multiple competitions — e.g. **Project Showcase**, **Datathon**, **Hackathon** — each with its own description, rules, schedule, and prize money. This project builds a public website plus a full Admin UI so that every year's event, its competitions, prizes, and news can be created and edited entirely from the backend — no code changes required between editions.

### Goals

- Showcase the current year's event on the home page: details, competitions, prize money, schedule.
- Let admins create/edit/delete events, competitions, prizes, news, and gallery photos from a protected Admin UI.
- Publish news articles (draft → published workflow).
- Archive previous years' events with details, results, and photo galleries.
- Clean, professional design: white background, generous whitespace, subtle animations.
- Participants register through a **built-in registration form** per competition. Registrations stored in the database; admins view, manage status, and export them from the Admin UI. Per-competition open/close toggle and deadline.

### Non-Goals (Phase 1)

- Participant accounts/login or project submission (registration is form-based, no accounts).
- Payment processing.
- Multi-language support.

---

## 2. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Nuxt 4** + TypeScript | SSR for SEO, file-based routing, built-in server API (Nitro), one codebase for site + admin + API |
| Styling | **Tailwind CSS** | Consistent spacing/typography system, fast iteration |
| Database / ORM | **Drizzle ORM** + SQLite (dev) → PostgreSQL (prod) | Portable, type-safe, hosting-agnostic; switching to Postgres is a config change |
| Auth | **nuxt-auth-utils** (session cookies) | Simple admin-only login; no user accounts needed |
| Validation | **Zod** | Validates all admin API payloads server-side |
| Animations | CSS transitions + **@vueuse/motion** | Subtle scroll-reveals and hover effects without heavy libraries |
| Images | Local uploads to `/public/uploads` | No vendor lock; can swap to S3-compatible storage later behind one utility |

> Hosting is undecided. This stack runs anywhere Node runs: Vercel, a VPS with Docker, Railway, etc. SQLite is fine for launch traffic; Postgres switch documented in Phase 5.

---

## 3. Data Model

```
events 1 ──── * competitions 1 ──┬── * prizes
   │                             └── * registrations
   └──── * gallery_images
news        (independent)
admins      (independent)
site_settings (key/value)
```

| Table | Fields |
|---|---|
| **events** | id, title, year, slug, description (rich text), start_date, end_date, venue, hero_image, status (`upcoming` \| `ongoing` \| `past`), is_current (featured on home), created_at, updated_at |
| **competitions** | id, event_id (FK), name, slug, type, description, rules (rich text), registration_open (bool), registration_deadline, team_based (bool), max_team_size, cover_image, sort_order |
| **prizes** | id, competition_id (FK), position ("Champion", "1st Runner-up"…), amount, note, sort_order |
| **registrations** | id, competition_id (FK), full_name, email, phone, institution, team_name (nullable), team_members (JSON: name/email list, for team competitions), notes, status (`pending` \| `confirmed` \| `rejected`), created_at |
| **news** | id, title, slug, excerpt, content (rich text), cover_image, status (`draft` \| `published`), published_at |
| **gallery_images** | id, event_id (FK), url, caption, sort_order |
| **admins** | id, name, email, password_hash |
| **site_settings** | key, value — hero tagline, contact email, social links, footer text |

Rules:
- Exactly one event may have `is_current = true` — setting it clears the flag elsewhere.
- Deleting an event cascades to its competitions, prizes, registrations, and gallery images (with confirm dialog in admin).
- Slugs auto-generated from titles, editable, unique.
- One registration per email per competition (unique constraint, friendly duplicate message).
- Registrations accepted only while `registration_open = true` and before `registration_deadline` — enforced server-side.

---

## 4. Public Site — Sitemap & Pages

| Route | Content |
|---|---|
| `/` | **Home** — hero with current event (title, tagline, dates, venue, countdown), competitions grid (card per competition: name, short description, prize money, "View details"), total prize pool highlight, latest 3 news items, previous events strip, footer with contact/socials |
| `/competitions/[slug]` | Competition detail — full description, rules, schedule, prizes table, **Register** button → built-in form (hidden/disabled when registration closed or deadline passed) |
| `/competitions/[slug]/register` | **Registration form** — name, email, phone, institution; team name + members if competition is team-based; validation, anti-spam, success confirmation screen |
| `/news` | News listing (published only), newest first, pagination |
| `/news/[slug]` | News article — cover image, content, publish date |
| `/events` | Archive — all past editions as cards (year, title, highlight) |
| `/events/[slug]` | Past event detail — description, competitions held, winners/results, photo gallery |

### Design Guidelines

- **Background:** pure white; sections separated by whitespace, not colored bands.
- **Whitespace:** large vertical rhythm (`py-24`+ sections), max-width content container, airy line-height.
- **Color:** near-black text, one accent color (used for buttons, links, prize highlights), light gray for secondary text and hairline borders.
- **Typography:** modern grotesque font (e.g. Inter / Plus Jakarta Sans), big confident headings, restrained sizes elsewhere.
- **Animation (subtle only):**
  - Scroll-reveal: fade + 16px slide-up on section entry, ~400ms ease-out, once.
  - Cards: slight lift + shadow on hover, ~150ms.
  - Page transitions: quick fade.
  - Respect `prefers-reduced-motion`.
- **Responsive:** mobile-first; competitions grid 1 → 2 → 3 columns.

---

## 5. Admin UI (`/admin`)

All `/admin/**` pages and `/api/admin/**` endpoints are session-protected by middleware. Login at `/admin/login`.

| Screen | Features |
|---|---|
| Dashboard | Counts (events, competitions, news), quick links, current event indicator |
| Events | List, create, edit, delete; set current event; status; hero image upload |
| Competitions | Managed under their event; create/edit/delete; rich text description & rules; registration open/close toggle + deadline; team settings; reorder; **inline prizes editor** (position, amount, note) |
| Registrations | List per competition; search/filter by status; view detail; set status (pending/confirmed/rejected); **CSV export**; registration count badges |
| News | List with draft/published filter; create/edit/delete; publish/unpublish; cover image |
| Gallery | Upload photos per event, captions, reorder, delete |
| Settings | Hero tagline, contact email, social links, footer text |
| Account | Change admin password |

### API Shape

- Public pages read via server-rendered data (`useAsyncData` + server utilities).
- **One public write endpoint:** `POST /api/registrations` — Zod-validated, rate-limited, honeypot anti-spam, checks registration window + duplicate email (see Security Plan).
- Admin mutations: `POST / PUT / DELETE /api/admin/{events|competitions|prizes|news|gallery|registrations|settings}` — Zod-validated, session-checked.
- CSV export: `GET /api/admin/registrations/export?competitionId=…`.
- Upload: `POST /api/admin/upload` (multipart) → stores in `/public/uploads`, returns URL.
- Seed script: creates first admin user (credentials from `.env`) + sample event/competitions/news for development.

---

## 6. Build Phases & Milestones

### Phase 1 — Scaffold (foundation)
- [ ] Nuxt 4 + TypeScript + Tailwind setup
- [ ] Drizzle + SQLite schema, migrations
- [ ] Seed script (admin user + sample data)
- [ ] Admin login/logout, session middleware

### Phase 2 — Admin CRUD
- [ ] Events management (incl. set-current logic)
- [ ] Competitions + prizes editor
- [ ] News with draft/publish
- [ ] Registrations screen (list, filter, status, CSV export)
- [ ] Gallery uploads
- [ ] Site settings
- [ ] Image upload endpoint

### Phase 3 — Public Site
- [ ] Layout, header/footer, design tokens
- [ ] Home page (all sections, data-driven)
- [ ] Competition detail page
- [ ] Registration form page + public `POST /api/registrations` endpoint (validation, anti-spam, window/duplicate checks)
- [ ] News listing + article
- [ ] Events archive + past event detail

### Phase 4 — Polish
- [ ] Scroll-reveal + hover + page-transition animations
- [ ] Responsive pass (mobile/tablet/desktop)
- [ ] SEO: meta tags, Open Graph, sitemap.xml
- [ ] Empty states (no current event, no news, etc.)
- [ ] Loading and error pages

### Phase 5 — Deploy Prep
- [ ] Environment config (`.env.example`)
- [ ] Postgres switch instructions
- [ ] Production build verification
- [ ] README: setup, admin guide, deployment options

---

## 7. Future Scope (post-launch)

- Participant accounts + project submission portal (login, dashboards).
- Email confirmations to registrants (registration received / status changed).
- Sponsors module (logos managed from admin, shown on home).
- Results/leaderboard publishing per competition.
- Email newsletter signup.
- Multi-language support.

---

## 8. Verification Checklist

- Admin can: log in → create event → mark current → add competitions with prizes → open registration → publish news → upload gallery photos — all without touching code.
- Visitor can register for a competition via the built-in form; admin sees it instantly, can confirm/reject, and export CSV.
- Registration correctly blocked when closed, past deadline, or duplicate email.
- Home page reflects admin changes immediately (SSR, no rebuild).
- Past event archive shows completed editions.
- Site scores well on Lighthouse (performance, SEO, accessibility); animations respect reduced motion.
