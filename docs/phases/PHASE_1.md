# Phase 1 — Foundation & Design System

## 1. Goal

Turn the untouched `create-next-app` scaffold into the court's visual home. At the end there is a themed app shell, a small set of reusable UI building blocks, and one page that displays all of them — so the look can be checked and tweaked before any real feature depends on it. No data, no login, no external accounts.

## 2. Prerequisites

- Nothing from earlier phases.
- `npm install` has been run and `npm run dev` starts (it does today).
- Read `node_modules/next/dist/docs/01-app/01-getting-started/13-fonts.md` and `11-css.md` first.

## 3. What gets built

**Theme**
- `app/globals.css` — replace the scaffold contents. Colour tokens, font tokens, radii and shadows in an `@theme` block; remove the hard-coded `body { font-family: Arial }` (it currently overrides the Geist font variables).
- `app/layout.tsx` — load **Inter** with `next/font/google`, set real metadata (title "AI Relationship Court"), warm cream page background, mobile viewport settings.

**Primitives** (`components/ui/`, one file each, small and boring)
- `button.tsx` — primary (espresso pill), secondary (frosted outlined pill), quiet (text-only). Pressed state scales to 0.98.
- `card.tsx` — white surface, 16px radius, hairline border, whisper shadow. Variant with the double-hairline "verdict" frame.
- `badge.tsx` — capsule badge for docket labels (e.g. `CASE #024 · PENDING`): uppercase, wide tracking, rose tint.
- `input.tsx`, `textarea.tsx` — white field, 12px radius, espresso focus border, label above.
- `segmented-control.tsx` — recessed cream track with a sliding white pill.
- `progress-bar.tsx` — thin bar; also the base of the responsibility meter in Phase 6.
- `section-heading.tsx` — the small uppercase docket-style label plus title.

**Shell**
- `components/app-shell.tsx` — centred mobile-width column (max ~430px on desktop, full width on phones), frosted top bar with the court name, frosted bottom tab bar (Docket · File Case · Verdicts). Tabs link to placeholder routes for now.
- `app/page.tsx` — a simple welcome/landing screen using the shell.
- `app/design/page.tsx` — the **design system showcase**: every primitive in every state on one scrolling page. Dev-only reference; hidden in production in Phase 2's proxy.

## 4. Key decisions

- **Mobile-first, single column.** The Stitch designs are mobile. Desktop just shows the same column centred. No separate desktop layout.
- **Tokens, not raw hex.** Components use names like `bg-canvas` and `text-espresso`, never `#3E2723`. Changing the palette later is a one-file edit.
- **Light theme only.** No dark mode; the cream canvas *is* the brand.
- **Plain components, no UI kit.** No shadcn or component library — this is the first project and fewer moving parts wins. Small hand-written primitives are easier to understand and restyle.
- **Icons:** `lucide-react` (one dependency, consistent stroke). Decide at implementation time whether that's worth it versus a few inline SVGs.
- **Use the Stitch designs for feel, not content.** The screens contain invented features (e.g. an "Emergency Trace Tool"); ignore those.

## 5. Implementation notes

**Palette to encode** (from the Stitch design system "Modern Judicial Romance"):

| Token | Value | Use |
|---|---|---|
| espresso | `#3E2723` | primary: buttons, headings, icons |
| rose | `#F4C9D6` | secondary: badges, highlights |
| canvas | `#F5F0E6` | page background (warm alabaster) |
| walnut | `#8C6D62` | muted text, dividers, inactive states |
| surface | `#FFFFFF` | cards |
| hairline | espresso at ~8% opacity | borders and dividers |

The design system also defines a full Material-style set (`surface-container-*`, `on-surface`, `error` `#BA1A1A`, etc.) — add only the ones a primitive actually uses.

**Type scale** (Inter): display-verdict 34/40 bold, headline-lg 24/30 semibold, headline-md 20/26, headline-sm 17/22, body-lg 17/24, body-md 15/21, body-sm 13/18, label-docket 11/14 bold uppercase with 0.06em tracking. Tight negative tracking on big headings.

**Shape and depth:** pill radius for buttons/badges/chips; 16px cards; 12px inputs. Cards get a 1px hairline plus a very soft espresso-tinted shadow — no heavy drop shadows. Bars use `backdrop-filter: blur(20px)` over ~85% cream.

**Tailwind v4 specifics:**
- Tokens go under `@theme` (or `@theme inline` when they reference CSS variables). Colour tokens named `--color-espresso` create the `bg-espresso` / `text-espresso` utilities automatically.
- Do **not** create `tailwind.config.js`.
- `postcss.config.mjs` already uses `@tailwindcss/postcss` — leave it.

**Next.js 16 specifics:**
- The scaffold's root layout is typed `LayoutProps<"/">` — keep that pattern.
- Server Components by default. Only add `"use client"` to a component that needs state or event handlers (the segmented control does; the card does not).
- Delete the leftover scaffold SVGs in `public/` once unused.

**Accessibility basics:** visible focus rings (espresso), real `<button>`/`<label>` elements, colour contrast of walnut-on-cream checked for body text.

## 6. Done when

- [ ] `npm run dev` shows the landing page on the cream background with Inter text — no Geist/Arial remnants and no scaffold "Get started" content.
- [ ] `/design` shows every primitive: three button styles, card and verdict-frame card, badges, input, textarea, segmented control, progress bar at several values.
- [ ] Clicking the segmented control visibly slides the selection.
- [ ] Bottom tab bar is visible and frosted; tabs navigate to placeholder pages without errors.
- [ ] Resized to phone width there is no horizontal scrolling; on desktop the app is a centred column.
- [ ] `npm run lint` and `npm run build` both pass.

## 7. Deliberately not in this phase

- Login, users, database → Phase 2
- The verdict meter, verdict frame content, Court Status panel → Phases 6 and 7
- Real content behind the tabs → Phases 2, 3 and 8
- Dark mode → not planned
