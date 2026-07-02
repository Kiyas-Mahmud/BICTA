# BICTA — Security Plan

Scope: public site with a built-in participant registration form + admin-only backend. No participant accounts, no payments. Primary assets to protect: **admin access**, **content integrity**, **participant PII** (names, emails, phone numbers in registrations), and **the server itself** (upload + public registration endpoints).

## 1. Threat Model (what we defend against)

| Threat | Vector | Mitigation section |
|---|---|---|
| Admin account takeover | Credential stuffing, brute force, session theft | §2, §3 |
| Content defacement | Unauthenticated access to admin APIs | §3 |
| Stored XSS on public site | Rich text fields, image captions, settings | §5 |
| Malicious file upload (webshell, oversized files) | Upload endpoint | §6 |
| SQL injection | Any user-supplied input reaching queries | §4 |
| CSRF on admin mutations | Cross-site request forging admin actions | §3 |
| Spam / bot registrations | Public registration endpoint | §6a |
| Participant PII leakage | Registrations data, CSV exports, logs | §6b |
| Secrets leakage | Repo, client bundle, error messages | §7 |
| Denial of service / abuse | Login, upload, and registration endpoints | §8 |

## 2. Authentication

- **Password hashing:** bcrypt (or argon2id) with adequate cost factor (bcrypt cost ≥ 12). Never store or log plaintext passwords.
- **Login endpoint** (`POST /api/admin/auth/login`):
  - Constant-time comparison via the hash library; identical error message and response time whether email exists or not ("Invalid credentials").
  - **Rate limiting:** max 5 attempts per IP per 15 minutes; lockout returns 429.
  - No account enumeration anywhere (including password change flow).
- **First admin** created by seed script from env vars (`ADMIN_EMAIL`, `ADMIN_PASSWORD`); script forces a strong password (min 12 chars) and refuses to run with defaults in production.
- **Password change** requires current password re-entry.

## 3. Session Management & Access Control

- **Sessions:** `nuxt-auth-utils` sealed (encrypted + signed) session cookies.
  - Cookie flags: `HttpOnly`, `Secure` (production), `SameSite=Lax`, scoped path `/`.
  - `NUXT_SESSION_PASSWORD` ≥ 32 random chars, from env only.
  - Session max age: 8 hours; renewed on activity. Logout destroys session.
- **Server-side enforcement is the source of truth:**
  - Every `/api/admin/**` handler calls `requireAdmin(event)` first — throws 401 before touching body or DB. Implemented once, imported everywhere; a handler without it is a code-review blocker.
  - Route middleware on `/admin/**` pages is UX only (redirect to login), never the security boundary.
- **CSRF:** `SameSite=Lax` cookie + all mutations on non-GET methods + Nitro origin check for state-changing requests. Admin API rejects requests whose `Origin`/`Host` mismatch in production.
- No privilege tiers in v1 (all admins equal). If roles are added later, enforce in `requireAdmin` variants, not in UI.

## 4. Input Validation & Injection

- **Zod schema per entity** validates every admin payload server-side: types, max lengths, enum values (`status`), URL format for `registration_link` and socials, integer bounds for amounts/years.
- **SQL injection:** Drizzle parameterizes all queries; raw SQL forbidden by convention. Slug/route params validated before use.
- **IDs from routes** parsed as integers; non-numeric → 400.
- Validation errors return 400 with field-level messages — never echo raw input back unescaped, never leak stack traces.

## 5. XSS & Content Sanitization

Rich text (event description, competition rules, news content) is admin-authored HTML — still sanitized, because admin browsers can be compromised and content is rendered on the public site.

- **Sanitize on write** (server-side, in the API handler) with `sanitize-html`: allowlist of tags (`p, h2–h4, ul, ol, li, a, strong, em, blockquote, img, br`), allowlist of attributes (`href`, `src`, `alt`), `href`/`src` restricted to `http(s)` and site-relative paths. Strips `<script>`, event handlers, `javascript:` URIs.
- All non-rich-text fields rendered with Vue's default escaping (`{{ }}`); `v-html` used **only** for the sanitized rich-text fields, nowhere else.
- **Security headers** (Nitro `routeRules` / middleware):
  - `Content-Security-Policy`: `default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'` (tighten after verifying Nuxt runtime needs)
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`

## 6. File Upload Security

The upload endpoint is the most dangerous surface. Controls:

- Admin session required (as all admin APIs).
- **Type validation by magic bytes** (file signature), not extension or client MIME: allow JPEG, PNG, WebP only.
- **Size limit:** 5 MB per file; multipart body size capped at server level.
- **Filename:** server-generated random (e.g. `crypto.randomUUID() + ext`); client filename never used in the path — eliminates path traversal.
- Files written only inside `/public/uploads`; resolved path verified to stay within that directory.
- Uploads directory must never be served with execute permissions; no SSR/handler execution from that path (static serving only).
- Optional hardening: re-encode images through `sharp` on upload — strips EXIF (location metadata) and neutralizes polyglot files.

## 6a. Public Write Endpoints

Three unauthenticated write paths exist; all are treated as hostile input by default and share the same hardening contract (`server/utils/rateLimit.ts`):

- **`POST /api/registrations`** — competition registration (PII).
- **`POST /api/newsletter`** — newsletter signup (email only). Order: rate limit (5/h/IP) → honeypot (`website`) → time-trap (3s `formToken`) → Zod email → `onConflictDoNothing` dedupe insert; duplicates return a friendly success without confirming prior state. Email is the only field stored; treat the subscriber list as PII per §6b.
- **`POST /api/contact`** — contact form (name, email, subject, message → `contact_messages`, admin-only read). Same order: rate limit (5/h/IP) → honeypot → time-trap → Zod (message ≤4000 chars) → insert. Message bodies are untrusted text: rendered escaped in the admin UI, never exposed in public payloads, kept out of logs.

Any further public write endpoint requires explicit security review before merge.

Registration specifics below.

- **Rate limiting:** 5 submissions per IP per hour; 429 on excess. Shared limiter utility with login/upload.
- **Anti-spam (layered, no user friction first):**
  - Honeypot field (hidden input; any value → silently accept and discard).
  - Time trap: reject submissions arriving faster than ~3 seconds after form render (token issued with timestamp).
  - Escalation path: if spam persists in production, add Cloudflare Turnstile (free, privacy-friendly) — wire point left in the handler.
- **Validation:** strict Zod schema — name/institution max lengths, RFC-compliant email (lowercased/trimmed before storage and uniqueness check), phone pattern, team members array capped at `max_team_size`, unknown keys stripped.
- **Business checks server-side:** competition exists, `registration_open = true`, deadline not passed, `(competition_id, email)` not already registered. Client-side disabled buttons are UX only.
- **Response discipline:** success returns confirmation only — never echoes stored data or internal IDs beyond what the UI needs. Duplicate email returns a friendly message without confirming whether other data exists.
- **Stored values are untrusted:** all registration fields rendered in the admin UI with default Vue escaping (no `v-html` anywhere near registration data) — a registration containing `<script>` must display as text in admin.
- **CSV export injection:** prefix cells starting with `= + - @` with `'` when generating CSV, so Excel does not execute formulas from attacker-supplied names.

## 6b. Participant PII Protection

- **Data minimization:** collect only what the competition needs (name, email, phone, institution, team info). No extra fields without justification.
- **Access:** registrations readable only via session-protected admin API; never exposed through public queries, sitemaps, or SSR payloads of public pages (registration counts may be shown publicly; identities never).
- **Logging:** request logs must not include registration bodies; log only metadata (route, status, IP for rate limiting).
- **Exports:** CSV downloads over HTTPS via authenticated admin session only; advise admins to handle exported files responsibly.
- **Retention:** registrations belong to their event; document a policy (e.g. delete or anonymize personal data N months after event ends) in the README; deleting an event cascades its registrations.
- **Disclosure:** registration form links to a short privacy note (what's collected, why, who sees it).

## 7. Secrets & Configuration

- All secrets via environment variables: `DATABASE_URL`, `NUXT_SESSION_PASSWORD`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (seed only).
- `.env` gitignored; `.env.example` committed with placeholder values.
- Secrets only in `runtimeConfig` (server side) — never in `runtimeConfig.public` or client bundles.
- Production errors: generic message to client; full detail to server logs only.
- Dependency hygiene: `npm audit` in CI; Dependabot/renovate for updates.

## 8. Rate Limiting & Abuse

- Login: 5/15min per IP (see §2).
- Registration: 5/hour per IP (see §6a).
- Upload: 30 requests/hour per session.
- Implemented via simple in-memory/Nitro storage limiter (sufficient for single instance); swap to Redis-backed if scaled.

## 9. Transport & Infrastructure

- **HTTPS only** in production (reverse proxy or platform TLS); HTTP → HTTPS redirect; `Strict-Transport-Security: max-age=31536000` once stable.
- DB not exposed publicly (localhost socket or private network).
- Admin path is well-known (`/admin`) — acceptable since security relies on auth, not obscurity. Optionally restrict by IP allowlist at the proxy if admin team is small.
- **Backups:** nightly DB dump + uploads directory copy; retention 30 days; restore procedure documented in README.

## 10. Security Checklist (pre-launch gate)

- [ ] All `/api/admin/**` routes call `requireAdmin` (grep-verified)
- [ ] Session cookie: HttpOnly + Secure + SameSite=Lax confirmed in browser devtools
- [ ] Login rate limit returns 429 after 5 failures
- [ ] Rich text sanitization strips `<script>` and `onerror` (manual test)
- [ ] Upload rejects: .php/.html/.svg files, files >5 MB, spoofed extensions
- [ ] Registration endpoint: rate limit fires, honeypot discards, closed/deadline/duplicate all rejected server-side (tested with curl, bypassing the form)
- [ ] Registration containing `<script>alert(1)</script>` as name renders as plain text in admin
- [ ] CSV export escapes formula-leading characters (`=`, `+`, `-`, `@`)
- [ ] Registrations absent from public SSR payloads (inspect `__NUXT__` data on public pages)
- [ ] No secrets in client bundle (`grep` build output for session password / DB URL)
- [ ] Security headers present on public + admin responses
- [ ] Production error pages leak no stack traces
- [ ] Seed script refuses default credentials when `NODE_ENV=production`
- [ ] Backup + restore tested once end-to-end
