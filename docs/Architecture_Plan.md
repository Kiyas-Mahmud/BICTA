# BICTA — Architecture Plan

## 1. System Overview

Single full-stack **Nuxt 4** application. One deployable unit serves three concerns:

```
┌─────────────────────────────────────────────────────────┐
│                      Nuxt 4 App                          │
│                                                          │
│  ┌────────────┐  ┌────────────┐  ┌───────────────────┐  │
│  │ Public Site│  │  Admin UI  │  │  Nitro Server      │  │
│  │ (SSR pages)│  │ (/admin/**)│  │  /api/admin/**     │  │
│  │ + reg. form│  │            │  │  /api/registrations│  │
│  └─────┬──────┘  └─────┬──────┘  └─────────┬─────────┘  │
│        │ useAsyncData  │ $fetch            │ Drizzle    │
│        └───────┬───────┘                   │            │
│                ▼                           ▼            │
│        server utilities  ──────►   SQLite / PostgreSQL  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
              /public/uploads (images)
```

- **Public site** — server-side rendered for SEO. Reads DB through server utilities during SSR. One public write endpoint: `POST /api/registrations` (built-in registration form).
- **Admin UI** — client-heavy pages under `/admin`, mutates via `/api/admin/**` endpoints.
- **Nitro server** — API routes, auth/session handling, validation, DB access, file uploads.

## 2. Directory Structure

```
bicta/
├── app/
│   ├── assets/css/main.css          # Tailwind entry, design tokens
│   ├── components/
│   │   ├── ui/                      # Button, Card, Badge, Input, Modal, RichTextEditor
│   │   ├── site/                    # Hero, CompetitionCard, NewsCard, EventTimeline,
│   │   │                            # PrizeTable, GalleryGrid, SectionReveal
│   │   └── admin/                   # DataTable, FormField, ImageUploader,
│   │                                # PrizeEditor, ConfirmDialog, AdminNav
│   ├── composables/                 # useToast, useConfirm
│   ├── layouts/
│   │   ├── default.vue              # public: header + footer
│   │   └── admin.vue                # admin: sidebar nav
│   ├── middleware/
│   │   └── admin.ts                 # route guard for /admin/** (except login)
│   └── pages/
│       ├── index.vue                # home
│       ├── competitions/[slug]/index.vue
│       ├── competitions/[slug]/register.vue   # built-in registration form
│       ├── news/index.vue
│       ├── news/[slug].vue
│       ├── events/index.vue
│       ├── events/[slug].vue
│       └── admin/
│           ├── login.vue
│           ├── index.vue            # dashboard
│           ├── events/  (index, new, [id].vue)
│           ├── competitions/ ([id].vue — edit incl. prizes)
│           ├── news/    (index, new, [id].vue)
│           ├── registrations.vue    # list/filter/status/CSV export
│           ├── gallery.vue
│           ├── settings.vue
│           └── account.vue
├── server/
│   ├── api/
│   │   ├── registrations.post.ts    # PUBLIC: registration form submit
│   │   └── admin/
│   │       ├── auth/ (login.post.ts, logout.post.ts)
│   │       ├── events/ (index.post.ts, [id].put.ts, [id].delete.ts)
│   │       ├── competitions/ …      # same pattern
│   │       ├── prizes/ …
│   │       ├── news/ …
│   │       ├── registrations/ (index.get.ts, [id].put.ts, export.get.ts)
│   │       ├── gallery/ …
│   │       ├── settings.put.ts
│   │       └── upload.post.ts
│   ├── database/
│   │   ├── schema.ts                # Drizzle schema (single source of truth)
│   │   ├── client.ts                # DB connection (driver switch via env)
│   │   └── migrations/
│   ├── utils/
│   │   ├── queries/                 # getCurrentEvent, getCompetitionBySlug,
│   │   │                            # getPublishedNews, getPastEvents …
│   │   ├── validation/              # Zod schemas per entity
│   │   ├── slug.ts                  # slugify + uniqueness
│   │   ├── rateLimit.ts             # shared limiter (login, registrations, upload)
│   │   └── requireAdmin.ts          # session assertion for API routes
│   └── plugins/                     # migration runner on boot (optional)
├── public/uploads/                  # uploaded images (gitignored)
├── scripts/seed.ts                  # admin user + sample data
├── drizzle.config.ts
├── nuxt.config.ts
└── .env / .env.example
```

## 3. Key Flows

### Public page render (e.g. home)
1. Request hits `/` → Nitro SSR.
2. `useAsyncData('home', () => …)` calls server query utils directly (same process, no HTTP hop).
3. Queries: current event + its competitions (with prize sums) + latest 3 published news + past events.
4. HTML rendered, hydrated client-side; subsequent navigation uses payload fetching.

### Admin mutation (e.g. edit competition)
1. Admin form submits → `$fetch('/api/admin/competitions/:id', { method: 'PUT', body })`.
2. Route handler: `requireAdmin(event)` → Zod parse → Drizzle update → return updated row.
3. UI refreshes local state; public pages reflect change on next request (SSR, no rebuild).

### Public registration submit
1. Visitor fills form at `/competitions/[slug]/register` → `$fetch('/api/registrations', { method: 'POST', body })`.
2. Handler order: rate limit check → honeypot check → Zod parse → competition exists & `registration_open` & deadline not passed → duplicate email check → insert → return success (no record data echoed).
3. Form shows confirmation screen; admin sees new row in Registrations screen immediately.

### Image upload
1. `POST /api/admin/upload` multipart → validate type/size → random filename → write to `/public/uploads` → return `{ url }`.
2. URL stored on the owning record. Storage utility isolated in one module so S3 swap later touches one file.

## 4. Data Layer

- **Drizzle ORM**, schema in `server/database/schema.ts`. Migrations generated by `drizzle-kit`, committed to repo.
- **Driver switch by env:** `DATABASE_URL` absent → local SQLite file (`.data/bicta.db`); present → Postgres. `client.ts` is the only file that knows which.
- Cascade deletes defined at schema level (event → competitions → prizes/registrations; event → gallery).
- Unique constraint: `(competition_id, email)` on registrations — one registration per email per competition.
- `is_current` uniqueness enforced in the set-current handler inside a transaction (clear all, set one).

## 5. Rendering & Caching Strategy

- All public pages: **SSR** (default). Content changes in admin appear on next request — no rebuilds, no ISR complexity.
- Optional later: `routeRules` with `swr: 60` on public routes if traffic demands caching.
- Static assets and uploads served by Nitro/CDN with long cache headers (filenames are content-unique).

## 6. State Management

- No global store needed. Server state via `useAsyncData`; admin forms hold local state; tiny shared bits (toasts) via composables. Add Pinia only if admin complexity demands it later.

## 7. Deployment Topology (hosting undecided — all supported)

| Option | Shape | Notes |
|---|---|---|
| VPS + Docker | Node server + Postgres container + volume for uploads | Most control; recommended once hosting chosen |
| Vercel/Netlify | Serverless Nitro preset + hosted Postgres (Neon/Supabase) + blob storage for uploads | Local-disk uploads NOT viable here — needs S3 swap |
| Railway/Render | Node service + managed Postgres + persistent disk | Middle ground |

> Decision point: if serverless hosting chosen, do the S3-compatible upload swap in Phase 5.

## 8. Cross-Cutting Conventions

- TypeScript strict mode; types inferred from Drizzle schema + Zod (`z.infer`).
- All admin write routes follow same skeleton: `requireAdmin → zod parse → db op → return`.
- The public registration route follows: `rate limit → honeypot → zod parse → business checks → db op` — the only write path without `requireAdmin`; any new public write endpoint needs explicit security review.
- Rich text stored as sanitized HTML (see Security Plan §5).
- Dates stored UTC ISO; formatted at display.
- Slugs unique per table, generated server-side.
