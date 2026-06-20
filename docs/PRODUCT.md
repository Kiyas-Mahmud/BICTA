# Product

## Register

brand

## Users

Students, young developers and data scientists in Bangladesh deciding whether to register for a competition; sponsors and judges checking credibility. Mobile-heavy audience, quick visits driven by social links. The job: understand the event, trust it, register in under two minutes.

## Product Purpose

Public face of BICTA, the annual tech competition (Project Showcase, Datathon, Hackathon). The site must make the event feel premium and real, surface prizes and deadlines instantly, and convert visitors into registrants through the built-in form. Success = registrations and sponsor trust. (The /admin app is a separate product-register surface; it stays functional and is not styled by this document.)

## Brand Personality

Energetic, credible, modern. A national tech festival: confident blue, clean white space, friendly pastel accents. Professional enough for sponsors and judges, lively enough for students. Clear hierarchy, generous breathing room, light motion. (Updated 2026-06-14: replaced the earlier achromatic "water on white" direction with a light blue-accent system per a user-supplied reference.)

## Anti-references

- Heavy/dark "hackathon" sites, crypto-glow, neon-on-black.
- Cluttered, dense layouts; heavy shadows; loud gradient meshes.
- Generic gradient text and hero-metric clichés.

## Design Principles

1. **Blue leads, neutrals carry, pastels accent.** Brand blue (#2563eb) for primary actions and emphasis; slate neutrals for structure; soft pastel tiles to differentiate icon categories. Color is purposeful, never decorative noise.
2. **Clean, not heavy.** Soft white cards with light borders and gentle shadows. Whitespace does the work; avoid visual clutter.
3. **Light, alive motion.** Floating ambient blobs, gentle hover lifts, scroll reveals, hero entrance. Subtle and smooth (ease-out), always reduced-motion safe.
4. **Type carries the brand.** Schibsted Grotesk, oversized tight headings, calm body.
5. **Consistent system, no per-page drift.** One set of tokens and classes (`card`, `btn-primary`, `tile`, `badge`, `field`) reused everywhere; public and admin share the blue accent.

## Accessibility & Inclusion

WCAG AA. Ink-on-white text contrast ≥ 7:1 for body. Glass surfaces never hold long-form text unless their effective background keeps ≥ 4.5:1. `prefers-reduced-motion` disables drift and reveals. Focus states visible (2px ink ring). Touch targets ≥ 44px on registration form.
