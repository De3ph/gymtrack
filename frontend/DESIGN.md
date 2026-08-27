# GymTrack Design Guidelines

> Repo-wide frontend design contract. Every page, component, and PR must follow this.
> The system is grounded in **one idea**: a fitness platform that takes itself seriously looks like a scoreboard, not a SaaS landing page.

---

## 1. The thesis

A two-sided product where athletes log daily and trainers read that log. The whole interface has one job: **make the next action obvious and the data legible**. Visual decoration competes with data, so decoration loses. Every screen is:

- **Flat** — 1px borders, hairline rules, no shadows.
- **Square** — `rounded-none` is the default; radii exist only where a primitive forces them.
- **Monospaced where data lives** — numbers, codes, kickers, labels, CTAs.
- **Quiet everywhere else** — body copy in `text-foreground` / `text-muted-foreground` only.

If a design choice doesn't serve the user reading or writing data, it doesn't ship.

---

## 2. The three rules

1. **No decoration without a role.** No blurred radial blobs, no gradient halos, no "ambient atmosphere" gradients. Color is signal, not mood.
2. **No `font-black`.** Display weight comes from size, tracking, and line-height — not from a weight switch.
3. **No stock photography.** A scoreboard is stronger without it. Use typography, marks, and live data instead.

If you're tempted to add any of these, you are about to produce AI-default design. Stop.

---

## 3. Tokens

All tokens are defined in `src/app/globals.css` as CSS variables. Tailwind v4 exposes them through `@theme inline`. **Never hardcode hex values in components.**

### 3.1 Color

| Token | Light | Dark | Role |
|---|---|---|---|
| `background` | `stone-50` | `stone-950` | Page surface |
| `foreground` | `stone-900` | `stone-200` | Primary text + filled-button bg |
| `card` | `#ffffff` | `stone-900` | Panel surface (use sparingly; see §6.2) |
| `primary` | `red-600` | `red-500` | One filled action per view |
| `accent` | `teal-500` | `teal-400` | Active / connected states only |
| `destructive` | `red-600` | `red-400` | Errors, destructive actions |
| `border` | `stone-200` | `stone-800` | Hairlines, dividers |
| `muted` | `stone-200` | `stone-700` | Hover, disabled, secondary surfaces |
| `muted-foreground` | `stone-500` | `stone-400` | Labels, kickers, secondary text |

**Primitives** (stone / red / teal / amber) are OKLCH ramps defined in `:root` and aliased in `@theme inline`. Use the semantic tokens in components. Use primitives only when no semantic fits and you've documented why.

**Signal economy**: the red `primary` and the teal `accent` are signal colors. Use one per section, in one place. If a section already uses `primary` for a button, it does not also use it for an icon. If `accent` is on a "connected" badge, it doesn't also color the heading.

### 3.2 Typography

| Role | Family | Weight | Size | Tracking | Use for |
|---|---|---|---|---|---|
| Display | `font-mono` (Geist Mono) | `400` | `text-2xl`–`text-[5.5rem]` | `tracking-[-0.04em]` | Hero, page titles, large section heads |
| Heading | `font-sans` (Inter) | `500` | `text-base`–`text-2xl` | default | Card titles, dialog titles, subheads |
| Body | `font-sans` | `400` | `text-sm`–`text-base` | default | Paragraphs, descriptions |
| Eyebrow / label / data | `font-mono` | `400` | `text-[10px]`–`text-xs` | `uppercase tracking-[0.18em]` | Section labels, kickers, button text, table headers, metrics |
| Numeric | `font-mono` | `400` | `text-3xl`–`text-5xl` | `tracking-tight` | Scoreboards, progress, KPIs |

**Forbidden**: `font-bold`, `font-extrabold`, `font-black` anywhere. Body copy in `text-foreground` and `text-muted-foreground` only. Display weight comes from size, not weight.

**Type scale** (line-height pairs to the size):

```
text-[10px] / leading-3   — eyebrow / label
text-xs       / leading-4 — kicker / button
text-sm       / leading-6 — body small / table cell
text-base     / leading-7 — body
text-lg       / leading-8 — body large
text-2xl      / leading-tight — h3
text-3xl      / leading-tight — h2
text-4xl      / leading-tight — h1
text-6xl+     / leading-[1.05] tracking-[-0.04em] — display
```

### 3.3 Spacing

- Section vertical rhythm: `py-16 sm:py-24 lg:py-32`. Use this. Don't invent new values.
- Section delimiter: `border-t border-border` on the `<section>`. No need for margins between sections.
- Card / panel internal padding: `px-6 py-6 sm:px-8 sm:py-8`. Two max widths: `max-w-3xl` for prose, `max-w-5xl` for hero.
- Page horizontal padding: `px-6 sm:px-8 lg:px-12`.
- Element-to-element gap inside a row: `gap-4` or `gap-6`. Never `gap-2` between a heading and body.

### 3.4 Radii

- Default: `rounded-none`.
- Allowed: `rounded-sm` (`var(--radius-sm)`) on inputs and toggles only — wherever a primitive's API forces a radius that would break the register if you didn't soften it. Document the case in a code comment.
- Forbidden: `rounded-xl`, `rounded-2xl`, `rounded-3xl`, `rounded-4xl` on any container.
- `rounded-full` is allowed only for the live-signal pulse dot (`size-1.5`).

### 3.5 Borders & dividers

- The default border is `border-border` at 1px. There is no `border-2`. Thicker means it isn't a hairline.
- For dividers in a list, prefer `divide-y divide-border` (or `divide-x`) on the parent over individual borders.
- For section rails and rule lines between content, use the `Separator` primitive from `@/components/ui/separator`. Don't reinvent it as `<span className="h-px ... bg-border" />`.

### 3.6 Shadows

- No drop shadows on any container.
- No `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl`, `shadow-2xl` on any container.
- A single exception: a focus ring is allowed (and required) on interactive elements.

### 3.7 Motion

- Library: `motion` (npm package, the framer-motion successor). All variants live in `src/components/features/<domain>/<domain>-variants.ts`.
- Three allowed variants, used by name:
  - `landingReveal` / `reveal` — `opacity` + `y: 18 → 0`, 350–450ms, `easeOut`. For text and small blocks entering.
  - `landingCard` / `card` — same as reveal, 350ms. For grid items.
  - `landingStagger` / `stagger` — wraps a parent, 80ms staggerChildren, 120ms delayChildren.
- Respect `prefers-reduced-motion`: if the user has it on, do not animate.
- Don't orchestrate scroll-locked timelines. Don't bounce. Don't overshoot.

### 3.8 Icons

- Library: `lucide-react`. No other icon source.
- Size: `size-3` (inline with mono text), `size-3.5` (in CTAs), `size-4` (row-leading), `size-5` (standalone). Never larger than `size-5` on a landing surface.
- Stroke inherits `currentColor`. Never set `stroke-width` on a lucide icon.
- An icon earns its place by labeling a row, a status, or a CTA. Decorative icons are `aria-hidden="true"`. Labeled icons have `aria-label` or sit next to visible text.

---

## 4. Layout

### 4.1 Page frame

Two-column grid for any marketing or landing surface:

```
<div className="grid grid-cols-[auto_1fr] gap-x-8 lg:grid-cols-[6rem_1fr]">
  <aside>    sticky section rail (§01 / §05)
  <main>     content
</div>
```

Dashboard and authenticated surfaces skip the rail; they use the existing `Sidebar` primitive from `@/components/ui/sidebar`.

### 4.2 Sections

A page is a stack of `<section>` elements separated by `border-t border-border`. Each section has:

1. A `<SectionRail>` (or its inline equivalent) with the section index `§01`–`§05` and a label.
2. A heading (`<h2>`) labelled with `id` and `aria-labelledby` on the section.
3. Content in a flat panel: `border border-border` with `divide-y divide-border` for rows.

```tsx
<section
  id="features"
  className="border-t border-border py-16 sm:py-24 lg:py-32"
  aria-labelledby="features-heading"
>
  <SectionRail index="03" label="What you log" />
  <div className="border border-border">
    ...
  </div>
</section>
```

### 4.3 Cards

A "card" in this system is a bordered panel with no shadow, no rounding, and internal hairlines. It is built from primitives in `@/components/ui/card` only when none of those primitives' baked-in styles conflict. The `Card` primitive as shipped has `rounded-xl shadow-xs ring-foreground/10` — these are not part of our register.

**Rule**: do not import `Card` for new surfaces. If you need a panel, write `<div className="border border-border">` with explicit children. If a dialog primitive is already inside the project, fine — but never reach for the `Card` family for marketing or feature surfaces.

The same applies to `Badge` (rounded-4xl, h-5). When you need a chip, write a `<span>` with explicit classes, or use `Badge` and override `rounded-none`.

---

## 5. Components — primitives to reach for

`src/components/ui/` ships 38 shadcn primitives. Reach for them in this order:

| Need | Primitive | Notes |
|---|---|---|
| Button-styled link | `buttonVariants` from `@/components/ui/button` | `Button` is a real `<button>`; for `<Link>` use the variant helper |
| Hairline divider | `Separator` | Use between content blocks, not `<span className="h-px bg-border" />` |
| Form field | `Field`, `FormField`, `Input`, `Label` | All already in the kit |
| Dialog / sheet | `Dialog`, `Sheet`, `Drawer` | For modal flows |
| Toast | `Toast` (sonner) | Errors, success, no decorative toasts |
| Empty state | `Empty` | Use for zero-data states |
| Tabs | `Tabs` | For in-page navigation only |
| Table | `Table` | For tabular data; not for marketing |
| Tooltip | `Tooltip` | For icon labels and dense rows |

**Don't** reach for: `Card`, `Badge`, `Carousel` (rounded/shadow register), `Avatar` (only if user-uploaded, never as decoration).

When you use a primitive, its baked-in styles win unless you override via `className` passed through `cn()`. `cn()` is `clsx + tailwind-merge`, so later classes win. Override `rounded-*`, `shadow-*`, and `ring-*` aggressively when you need to stay in register.

---

## 6. Writing

### 6.1 Voice

Plain, present, specific. The interface is the manual, not a brochure.

- "Log a workout" — not "Start your fitness journey."
- "Trainer: 1 active" — not "Build relationships with our community of elite coaches."
- "Loading…" — not "Please wait while we work our magic."

### 6.2 Buttons

A button says what happens when it's used. The same action keeps the same name everywhere.

| Action | Button label | Toast |
|---|---|---|
| Create account | Sign up | Account created |
| Sign in | Login | Welcome back |
| Save changes | Save | Saved |
| Discard | Cancel | (no toast) |
| Delete | Delete | Deleted |

No "Submit" on anything except form submission. No "Learn more" — link to the destination with the destination's name.

### 6.3 Errors

Errors explain what went wrong and how to fix it. They don't apologize.

- "Email already in use. Try logging in." — not "Oops! Something went wrong."
- "Workout can only be edited within 24 hours of being logged." — not "Edit window expired."

### 6.4 Empty states

Empty states invite action, not reflection.

- "No workouts this week. Log your first session." — not "You haven't started yet!"
- One sentence. One CTA.

### 6.5 Case

- Sentence case for everything except product names (`GymTrack`, `i18n`).
- Eyebrow / kicker text is **uppercase** with tracking, never title case.
- All-caps body text is forbidden.

---

## 7. Accessibility floor

These are non-negotiable. They ship in every PR.

- **Keyboard**: every interactive element is reachable via Tab, has a visible `focus-visible` ring, and Esc closes any open dialog/menu.
- **Color contrast**: text on background meets WCAG AA. The palette is already audited for this — see `globals.css` comments. Don't introduce a new color without checking.
- **Reduced motion**: if the user prefers reduced motion, no animation runs. Wrap any motion in a check.
- **Icon-only buttons**: have `aria-label`. Decorative icons are `aria-hidden="true"`.
- **Form fields**: every input has a visible label (not just a placeholder). Errors are announced via `aria-describedby` and `aria-invalid`.
- **Headings**: one `<h1>` per page, then `<h2>` per section, then `<h3>`. No skipped levels.
- **Landmarks**: one `<main>`, one `<nav>` per nav region, `<header>` and `<footer>` where they exist. Sections have `aria-labelledby`.

---

## 8. What to reach for vs. what to avoid

| ✅ Use | ❌ Don't use |
|---|---|
| `border border-border` + `divide-y divide-border` | `rounded-2xl shadow-lg bg-card` panels |
| `font-mono` for labels, kickers, data | `font-bold` / `font-black` display headings |
| 1.05–1.1 line-height on display | 1.25+ line-height on display |
| `tracking-[-0.04em]` on display | `tracking-tight` or default on display |
| `uppercase tracking-[0.18em]` on labels | Sentence case on labels and CTAs |
| `buttonVariants({ variant, size, className: "rounded-none ..." })` for link-styled buttons | `<button onClick={() => navigate(...)}>` or raw inline-class `<Link>` |
| `Separator` for hairlines | `<span className="h-px w-full bg-border" />` |
| One color as signal per section | Multiple accent colors per section |
| Live data where it earns its place | Decorative stats ("10K+ users") |
| `text-foreground` / `text-muted-foreground` for body | `text-gray-500` hardcoded colors |
| Geometric icons (`Radio`, `Activity`, `BarChart3`) for status | Filled icons, hand-drawn marks, emoji |

---

## 9. PR review checklist

Before requesting review on a UI change, verify:

- [ ] No new shadows, no new large radii, no `font-black`.
- [ ] Color is from semantic tokens, not hex values.
- [ ] Section rhythm matches `py-16 sm:py-24 lg:py-32` and `border-t border-border`.
- [ ] Body copy is sentence case; labels are uppercase mono.
- [ ] Buttons say what they do. Errors say what to fix.
- [ ] Keyboard tab order is sane. Focus rings are visible.
- [ ] `prefers-reduced-motion` is respected.
- [ ] No regression in Lighthouse a11y score.
- [ ] Light and dark themes both look right. (Switch the theme toggle and re-check.)
- [ ] Stock photos and decorative gradient blobs: not present.
- [ ] Translation keys exist in both `messages/en.json` and `messages/tr.json`. Run `pnpm validate:i18n`.

If any box is unchecked, the change is not ready.

---

## 10. Worked example — a new section

You need to add a "Pricing" section to the landing page. Here's what it should look like.

```tsx
<section
  id="pricing"
  className="border-t border-border py-16 sm:py-24 lg:py-32"
  aria-labelledby="pricing-heading"
>
  <SectionRail index="06" label="Pricing" />

  <div className="border border-border">
    <header className="flex items-center justify-between border-b border-border px-6 py-4 sm:px-8">
      <h2
        id="pricing-heading"
        className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
      >
        Plans
      </h2>
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        3 tiers
      </span>
    </header>

    <ul className="divide-y divide-border">
      {plans.map((plan) => (
        <li
          key={plan.id}
          className="grid grid-cols-[1fr_auto_auto] items-center gap-6 px-6 py-6 sm:px-8 sm:py-8"
        >
          <div>
            <h3 className="text-base font-medium text-foreground">
              {plan.name}
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {plan.description}
            </p>
          </div>
          <span className="font-mono text-2xl font-normal tracking-tight text-foreground">
            {plan.price}
          </span>
          <Link
            href={plan.href}
            className={buttonVariants({
              variant: "outline",
              size: "lg",
              className:
                "rounded-none border-foreground font-mono text-xs uppercase tracking-[0.18em] hover:bg-foreground hover:text-background",
            })}
          >
            Choose
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  </div>
</section>
```

That's the whole pattern. It recurs across `LandingConsole`, `LandingFeatureGrid`, `LandingRolePaths`, `LandingProof`. Learn it once, repeat it.

---

## 11. Reference

- **Color palette roles**: `src/app/globals.css` (`@theme inline`, `:root`, `.dark`).
- **Tailwind v4 config**: `src/app/globals.css` (CSS-first config, no `tailwind.config.js`).
- **shadcn primitives**: `src/components/ui/` (38 components).
- **Motion variants**: `src/components/features/landing/landing-variants.ts` — replicate the pattern per feature.
- **Existing reference surfaces** (the system in action):
  - `src/app/[locale]/LandingClient.tsx` — page frame, section rails.
  - `src/components/features/landing/LandingHero.tsx` — display type, metrics.
  - `src/components/features/landing/LandingConsole.tsx` — scoreboard panel, live signal.
  - `src/components/features/landing/LandingFeatureGrid.tsx` — table-as-list.
  - `src/components/features/landing/LandingRolePaths.tsx` — comparison split, monospaced bullets.
  - `src/components/features/landing/LandingProof.tsx` — proof section, single CTA.

When in doubt, open one of these and match it.
