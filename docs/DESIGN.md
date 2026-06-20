# DESIGN.md — BICTA public site

Aesthetic lane: **achromatic liquid glass**. Named reference: "Vercel pure-black monochrome discipline, rebuilt as water: Apple visionOS glass physics with zero hue." Everything below applies to the public site only; /admin keeps its plain functional styling.

## Theme

Light. Pure-feeling white field (`oklch(99.2% 0.002 250)`, never #fff). No dark mode in v1.

## Color

Strategy: Restrained monochrome, zero accent.

| Token | OKLCH | Use |
|---|---|---|
| `--paper` | 99.2% 0.002 250 | page background |
| `--ink` | 17% 0.004 250 | headings, primary buttons |
| `--ink-soft` | 42% 0.004 250 | body text |
| `--ink-faint` | 62% 0.003 250 | metadata, placeholders |
| `--mist-1` | 95% 0.003 250 | light-field blobs (visible through glass) |
| `--mist-2` | 90% 0.004 250 | deeper light-field, table header tint |
| `--hairline` | 88% 0.003 250 | 1px borders |

Status communication without color: filled ink dot = open/positive, outline dot = closed/neutral. Never green/red on the public site.

## Glass physics (the system)

Three depths, used by role, never mixed on one element:

1. **`glass-float`** (nav, sticky elements): `background: rgba(255,255,255,.55)`, `backdrop-filter: blur(20px) saturate(1.1)`, hairline border, shadow `0 2px 16px rgba(10,12,16,.05)`.
2. **`glass-card`** (cards, panels): `rgba(255,255,255,.38)`, `blur(14px)`, border `1px solid rgba(255,255,255,.7)` over hairline shadow ring, top specular: `inset 0 1px 0 rgba(255,255,255,.9)`, ambient shadow `0 16px 40px -20px rgba(10,12,16,.12)`.
3. **`glass-deep`** (hero stat slab, prize table): `rgba(255,255,255,.28)`, `blur(22px)`, stronger specular sweep via `::before` diagonal white gradient (40% → transparent).

Glass needs something to refract: fixed full-viewport **light-field** layer of 3 huge gray radial blobs (`--mist-1/2`) drifting at 60–90s loops, plus faint concentric ripple rings (1px hairline circles) behind the hero. Pure gray, no hue.

Rules: radius 24px on cards, 9999px on pills. Nested glass is banned (solid or transparent children only). Long-form text never sits on `glass-deep`.

## Typography

Family: **Schibsted Grotesk** (Google Fonts), single family, weights 400 / 500 / 700 / 800. Body 400, UI labels 500, headings 700–800 with `letter-spacing: -0.03em`.

Scale (fluid): display `clamp(2.75rem, 7vw, 5.5rem)` / h2 `clamp(1.9rem, 3.5vw, 2.75rem)` / h3 1.35rem / body 1rem / meta 0.8125rem. Ratio ≥ 1.4 between steps. Body line length ≤ 70ch, line-height 1.65.

## Layout

12-col fluid, max-width 76rem, gutters `clamp(1.25rem, 4vw, 3rem)`. Section padding `clamp(5rem, 10vh, 8rem)`. Hero is asymmetric: type block left-aligned, glass stat slab offset right and overlapping the ripple field. Card grids: `repeat(auto-fit, minmax(280px, 1fr))`.

## Components

- **Nav**: floating glass pill, detached from top by 12px, centered, shrinks on scroll.
- **Buttons**: `btn-ink` solid ink/white text (primary action), `btn-glass` glass pill with ink text (secondary). Hover: lift 1px + shadow, 150ms ease-out-quart.
- **Cards**: `glass-card`, hover lift 4px + specular shift, content = type only (no icon rows).
- **Prize table**: `glass-deep` slab, rows separated by hairlines, amounts in 800 weight ink.
- **Forms** (registration): inputs are frosted wells `rgba(255,255,255,.5)` + hairline, focus = 2px ink ring. Labels 500 weight.
- **Badges**: glass pill + status dot system (filled/outline ink).

## Motion

Tokens: 150ms ease-out-quart (hover), 450ms cubic-bezier(0.22,1,0.36,1) (reveals: fade + 16px rise, once), 60–90s linear drift (light-field). No bounce, no parallax. `prefers-reduced-motion`: drift and reveals off, hovers reduced to shadow change.
