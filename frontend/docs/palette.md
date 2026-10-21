# GymTrack design tokens

The color system is one file: **`src/app/palette.css`**. Everything else in
the app consumes it. This document is the contract for changing it.

## Layers

```
palette.css
├── :root                 primitives (stone / red / teal / amber, 11 steps each)
│                         + light semantics
│                         + status tokens
│                         + avatar swatches
├── .dark                 dark semantics — same primitives, re-pointed
└── .surface-inverted     landing dark band — same primitives, re-pointed
        │
        ▼
globals.css  @theme inline  →  Tailwind utilities (bg-primary, text-muted-foreground)
        │
        ▼
shadcn/ui primitives + feature components  →  semantic tokens only
```

**Primitives** are raw ramps. They are never referenced directly by a
component except through the primitive utilities (`bg-stone-950`).

**Semantics** are the shadcn contract: `background`, `foreground`, `card`,
`primary`, `secondary`, `muted`, `accent`, `destructive`, plus `border`,
`input`, `ring`, `chart-1..5`, `sidebar-*`, `success`, `warning`, `info`.

**Scopes** re-point the semantic contract without touching a component. A
scope is a class that redeclares the semantic variables; because
`@theme inline` keeps the `var()` reference instead of copying the value, the
utilities inside the scope follow automatically.

## Rules

1. **No literal colors outside `palette.css`.** `pnpm check:colors` fails the
   build on a hex, an `rgb()`/`oklch()` call, or a Tailwind arbitrary color
   class (`bg-[#0c0a09]`).
2. **No off-ramp utilities.** Only the four declared ramps — stone, red, teal,
   amber — plus the semantic and avatar tokens may be used. `bg-emerald-500`
   compiles (Tailwind's default theme is still active) but it is not part of
   this palette, so it would not follow a swap.
3. **Contrast is checked, not assumed.** `pnpm check:tokens` parses the CSS,
   resolves every `var()` chain, converts OKLCH to sRGB, and asserts every
   foreground/background pair against WCAG 2.2 AA (4.5:1 body, 3:1 large).

## Swapping the palette

1. Edit the primitive ramps in `:root` (or replace them with new ramps).
2. Re-point the semantics in `:root`, `.dark` and `.surface-inverted` — the
   anchor steps matter most: `--primary` is the filled action, `--accent` the
   interactive highlight, `--destructive` the danger color.
3. Re-check the foregrounds. A hue change invalidates every ratio; the
   contrast annotations next to each token state the measured value.
4. Run `pnpm check:design` and fix what it reports. It is the gate, not a
   report.
5. Update `src/lib/palette.json` if the theme color, manifest colors or the
   PWA icon colors changed. The checker names the exact fields to update.
6. Run `pnpm generate:icons` if the icon colors changed.

Nothing in `src/components` has to change for a color swap. That is the
point of the semantic layer.

## Adding a new color

Do not add a utility call site. Add a semantic token in `palette.css`, map it
in the `@theme inline` bridge in `globals.css`, and use it.

```css
/* palette.css */
--brand-surface: var(--teal-200);
```

```css
/* globals.css */
--color-brand-surface: var(--brand-surface);
```

```tsx
<div className="bg-brand-surface" />
```

If it carries text, add the matching `-foreground` token and a contrast pair
in `scripts/check-tokens.ts` — a token that is never checked is a token that
will silently fail.

## Tooling

| Command | What it does |
|---|---|
| `pnpm check:tokens` | Contrast + `palette.json` mirror. Exits non-zero on failure. |
| `pnpm check:tokens -- --print-primitives` | Prints the hex the browser actually renders for every primitive. Use it to keep the reference comments honest. |
| `pnpm check:colors` | Fails on literal or off-ramp colors in `src/`. |
| `pnpm check:design` | Both of the above. |
| `pnpm generate:icons` | Regenerates the PWA icons from `palette.json`. |

## A note on the hex comments

Each primitive carries the sRGB hex in a comment. Those hexes are the color
the browser renders, and they were wrong for a long time: the file held
Tailwind v3 hexes next to Tailwind v4 OKLCH values, which do not agree
(`red-500` renders as `#fb2c36`, not `#ef4444`). Regenerate the comments with
`pnpm check:tokens -- --print-primitives` after touching a ramp.
