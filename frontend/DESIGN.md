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

All color tokens are defined in `src/app/palette.css` as CSS variables; `src/app/globals.css` only bridges them onto Tailwind via `@theme inline`. **Never hardcode hex values in components** — `pnpm check:colors` fails the build if you do.

### 3.1 Color

| Token | Light | Dark | Role |
|---|---|---|---|
| `background` | `stone-50` | `stone-950` | Page surface |
| `foreground` | `stone-900` | `stone-200` | Primary text + filled-button bg |
| `card` | `#ffffff` | `stone-900` | Panel surface (use sparingly; see §6.2) |
| `primary` | `red-600` | `red-500` | One filled action per view |
| `primary-foreground` | `#ffffff` | `stone-950` | Label on the filled action |
| `accent` | `teal-500` | `teal-400` | Active / connected states only |
| `destructive` | `red-600` | `red-400` | Errors, destructive actions |
| `border` | `stone-200` | `stone-800` | Hairlines, dividers |
| `muted` | `stone-200` | `stone-800` | Hover, disabled, secondary surfaces |
| `muted-foreground` | `stone-600` | `stone-400` | Labels, kickers, secondary text |

**Primitives** (stone / red / teal / amber) are OKLCH ramps defined in `:root` of `palette.css` and aliased in `@theme inline`. Use the semantic tokens in components. Use primitives only when no semantic fits and you've documented why.

**Scopes**: a class that redeclares the semantic variables re-points them for a subtree. `.surface-inverted` (the landing dark band) is the only one today.

**Signal economy**: the red `primary` and the teal `accent` are signal colors. Use one per section, in one place. If a section already uses `primary` for a button, it does not also use it for an icon. If `accent` is on a "connected" badge, it doesn't also color the heading.

### 3.2 Typography

| Role | Family | Weight | Size | Tracking | Use for |
|---|---|---|---|---|---|
| Display | `font-mono` (Geist Mono) | `500` | `text-2xl`–`text-[5.5rem]` | `tracking-[-0.04em]` | Hero, page titles, large section heads |
| Heading | `font-sans` (Inter) | `600` | `text-base`–`text-2xl` | default | Card titles, dialog titles, subheads |
| Body | `font-sans` | `500` | `text-sm`–`text-base` | default | Paragraphs, descriptions |
| Eyebrow / label / data | `font-mono` | `500` | `text-[10px]`–`text-xs` | `uppercase tracking-[0.18em]` | Section labels, kickers, button text, table headers, metrics |
| Numeric | `font-mono` | `600` | `text-3xl`–`text-5xl` | `tracking-tight` | Scoreboards, progress, KPIs |

**Allowed**: `font-normal` (`400`) for de-emphasized secondary text only, `font-medium` (`500`) for display/body/label, `font-semibold` (`600`) for heading/numeric. **Forbidden**: `font-bold` (`700`), `font-extrabold`, `font-black` anywhere. Body copy in `text-foreground` and `text-muted-foreground` only.

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

`src/components/ui/` ships 38 shadcn primitives. **Use them. Don't reinvent.** Every primitive in the repo is the canonical answer to a recurring UI problem; building a parallel version is technical debt.

When a primitive's defaults conflict with the register (rounded corners, shadows, colored chips), the answer is **wrap it with `cn()` overrides**, not skip it. `cn()` is `clsx + tailwind-merge`, so later classes win.

### 5.1 Default — use as-is, no overrides

These primitives already fit the register.

| Primitive | Use it for |
|---|---|
| `Button` (`@base-ui/react/button`) | A real `<button>` that submits or triggers an action. |
| `buttonVariants` | The styling helper. Use this on `<Link>` and `<a>` when you need a button-styled navigation element. The `<Button>` component itself is for `<button>` only — `Link` won't navigate via a real `<button>`. |
| `Separator` | Hairline rules between content blocks. Already `bg-border h-px w-full` by default — register-perfect. |
| `Input`, `Textarea`, `Label` | Form controls. Default is `rounded-md` (`var(--radius-md)`) — keep it; the input register allows it (see §3.4). |
| `Field`, `FieldGroup`, `FieldSet`, `FieldLabel`, `FieldDescription`, `FieldError`, `FieldSeparator`, `FieldContent`, `FieldTitle`, `FieldLegend` | Canonical form layout. `FieldError` ships with `role="alert"` and lists multiple errors — use it. |
| `FormField` | The TanStack Form glue. |
| `Dialog`, `Sheet`, `Drawer`, `AlertDialog`, `Popover` | Modal flows. Backdrop and surface are fine. |
| `Toast` (sonner) | Errors, success, no decorative toasts. |
| `Tooltip` | Icon labels, dense row hints. |
| `Tabs` | Use the `variant="line"` prop — it strips the `bg-muted` background and uses a hairline underline. Default variant is wrong for the register. |
| `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`, `TableCaption`, `TableFooter` | Tabular data (admin, lists). The default `TableRow` uses `hover:bg-muted/50` — fine. |
| `Item`, `ItemGroup`, `ItemSeparator`, `ItemMedia`, `ItemContent`, `ItemTitle`, `ItemDescription`, `ItemActions`, `ItemHeader`, `ItemFooter` | **The hairline row primitive.** When you need a row with an icon, a title, an optional description, and a value or action — reach for `Item`. It carries `divide-y` behavior, sensible focus rings, and `size` variants. **Replace ad-hoc `<li>` grids with `Item` whenever the row is "icon + title + value" shaped.** |
| `Empty`, `EmptyHeader`, `EmptyTitle`, `EmptyDescription`, `EmptyContent`, `EmptyMedia` | Zero-data states. The `EmptyMedia variant="icon"` adds a tinted icon box — override with `rounded-none` if you need the scoreboard register; otherwise it's fine for empty states. |
| `InfoRow` | A precomposed icon + label + value row. **Use it in detail views, profile pages, settings.** Don't rebuild this in feature code. |
| `Spinner` | The `Loader2Icon` spinner with `role="status"`. Default `size-4 animate-spin`. Use in buttons, form fields, list headers. |
| `Skeleton` | Loading placeholders for table rows and card stacks. |
| `ScrollArea` | Custom scroll containers — workouts calendar, sidebar overflow. |
| `Pagination` | Paginated list controls. |
| `Combobox`, `Command` | Search + select. `cmdk` under the hood. |
| `Select` | Native-ish select with search support. |
| `DatePicker` (date-picker) | Calendar picker. |
| `Calendar` | Standalone calendar (used by `DatePicker`). |
| `Checkbox`, `Toggle` | Boolean inputs. |
| `Form`, `FormField` | TanStack Form + Zod binding. |
| `InputGroup`, `InputOTP` | Compound input layouts. |
| `Avatar` | User-uploaded avatars only. **Not for decoration.** |
| `Chart` (recharts wrapper) | The single signal color (`var(--chart-1)`) lives here. Use the `Chart` primitive for any visualization, not raw recharts. |
| `Carousel` (embla) | Reserved for genuine carousels (testimonial rotations, image galleries). **Not for hero decoration.** |
| `Sidebar` + `SidebarMenuButton` | Authenticated-app left rail. Marketing/landing surfaces don't use it — they use the `SectionRail` pattern from §4.1. Drive it through `AppSidebar` + the `useNavItems` registry rather than hand-rolling links. |
| `DetailSection` | Profile/admin detail row. Wraps `Card` — see §5.2. |

### 5.2 Wrap with overrides — these conflict with the register

These primitives have one or more styles that violate the register. The fix is to pass `className` overrides through `cn()`. Do not skip them.

| Primitive | What conflicts | Override |
|---|---|---|
| `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`, `CardAction` | `rounded-xl shadow-xs ring-foreground/10 overflow-hidden py-6` | Add `"rounded-none border border-border shadow-none ring-0 overflow-visible"` to each part. |
| `Badge` | `rounded-4xl h-5 px-2 py-0.5` (pill, fixed height) | Add `"h-auto rounded-none px-3 py-1.5"` to match the scoreboard chip. |
| `DetailSection` | Wraps `Card` directly, no override hook | Compose `Card` parts yourself with overrides, or wrap `DetailSection` in a thin local component that adds the overrides. |
| `Avatar` | `rounded-full` | Allowed for user-uploaded avatars only. Don't reach for it on landing surfaces. |
| `Empty` | `rounded-lg border-dashed p-12` (dashed border, rounded, big padding) | Override with `"rounded-none border border-border"`. Keep `p-12` only if you have the vertical space. |
| `Tabs` (default variant) | `bg-muted p-[3px] rounded-lg` on the list | Always pass `variant="line"` to `TabsList`. |
| `Tooltip` content | `rounded-md` | Override content via `<TooltipContent className="rounded-none ..." />`. |
| `Dialog`/`Sheet`/`Drawer` content | `rounded-xl` on the panel, sometimes `shadow-lg` | Override via content `className` to `"rounded-none border border-border shadow-none"`. |
| `Sonner` (toast) | `rounded-lg` | Theme via `<Toaster className="rounded-none" />`. |
| `Carousel` content | Often `rounded-2xl` | Override content `className` to `"rounded-none"`. |

**The override pattern is identical every time**: import `cn` from `@/lib/utils`, pass `className={cn(<primitive-defaults-override>, yourClass)}`. Never mutate the primitive file in `src/components/ui/` to add register-specific styles — keep overrides local to the consumer.

### 5.3 Never use for new surfaces

- `Card` family, `Badge`, `Carousel`, `Avatar` (as decoration) — see §5.2 and the forbidden list in §3.4. If a feature insists, it must be `Card` parts with explicit overrides, not the raw primitive.

### 5.4 When there is no primitive

If the registry doesn't cover what you need, write it as a feature component (`src/components/features/<domain>/`). Do **not** add a new file to `src/components/ui/` for a one-off. A primitive moves to the registry only after it's been reused by 3+ feature domains.

The reference for the in-domain pattern: `LandingFeatureGrid`, `LandingRolePaths`, `LandingConsole` — these build the "hairline panel + divide-y rows" pattern by composing `Separator` and `Item`, not by writing custom divs.

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
- **Color contrast**: text on background meets WCAG AA. The palette is checked, not assumed — `pnpm check:tokens` resolves every token pair and fails on a violation. Don't introduce a new color without running it.
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
- [ ] Color is from semantic tokens, not hex values (`pnpm check:colors` enforces this).
- [ ] `pnpm check:tokens` passes — no contrast regression.
- [ ] Section rhythm matches `py-16 sm:py-24 lg:py-32` and `border-t border-border`.
- [ ] Body copy is sentence case; labels are uppercase mono.
- [ ] Buttons say what they do. Errors say what to fix.
- [ ] Keyboard tab order is sane. Focus rings are visible.
- [ ] `prefers-reduced-motion` is respected.
- [ ] No regression in Lighthouse a11y score.
- [ ] Light and dark themes both look right. (Switch the theme toggle and re-check.)
- [ ] Stock photos and decorative gradient blobs: not present.
- [ ] Translation keys exist in both `messages/en.json` and `messages/tr.json`. Run `pnpm validate:i18n`.
- [ ] **Used a shadcn primitive from `@/components/ui/` for every recurring pattern** (button, divider, row, field, dialog, table, tabs, empty state, tooltip, spinner). If a primitive's defaults conflict, override via `className` — do not invent a new local component. See §5.2.
- [ ] If a `<li>` row has the shape "icon + title + value" or "icon + title + description + action", it uses `Item` (and friends), not a hand-rolled grid.

If any box is unchecked, the change is not ready.

---

## 10. Patterns — composing primitives

Three patterns recur everywhere. Memorize them.

### 10.1 Hairline panel

A bordered container with no shadow, no rounding, internal hairlines. Built from `<div className="border border-border">` and `divide-y divide-border` (or `Separator` between explicit rows). **Don't import `Card` for this — write the div.**

```tsx
<div className="border border-border">
  <header className="flex items-center justify-between border-b border-border px-6 py-4 sm:px-8">
    <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
      Title
    </h2>
  </header>
  <ul className="divide-y divide-border">{rows}</ul>
</div>
```

### 10.2 Section rail

`Separator` is the canonical rail. It is `bg-border h-px w-full` by default.

```tsx
function SectionRail({ index, label }: { index: string; label: string }) {
  return (
    <div className="mb-10 flex items-baseline gap-6 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
      <span className="text-foreground">§{index}</span>
      <span>{label}</span>
      <Separator className="flex-1" />
    </div>
  );
}
```

### 10.3 Hairline row — use `Item`

When a row is shaped "icon + title + (description) + value/action", use `Item`. Override its defaults so the border is `border-border` and the radius is zero. Sizes `default` / `sm` / `xs` cover the common cases.

```tsx
import {
  Item,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
} from "@/components/ui/item";

<ul className="border border-border">
  {rows.map((row) => (
    <Item
      key={row.id}
      variant="outline"
      size="default"
      className="rounded-none border-0 border-b border-border last:border-b-0"
    >
      <ItemMedia variant="icon" className="rounded-none">
        <row.Icon className="size-4 text-muted-foreground" aria-hidden="true" />
      </ItemMedia>
      <ItemContent>
        <ItemTitle className="text-sm font-medium text-foreground">
          {row.title}
        </ItemTitle>
        <ItemDescription className="text-sm text-muted-foreground">
          {row.description}
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <span className="font-mono text-sm text-foreground">{row.value}</span>
      </ItemActions>
    </Item>
  ))}
</ul>
```

This replaces the previous "hand-rolled `<li>` with a 4-column grid" pattern. **Item is the new default for any row.**

### 10.4 Empty state — use `Empty`

Override the `rounded-lg border-dashed` defaults.

```tsx
<Empty className="rounded-none border border-border p-12">
  <EmptyHeader>
    <EmptyTitle className="font-mono text-base uppercase tracking-[0.18em]">
      No workouts this week
    </EmptyTitle>
    <EmptyDescription>
      Log your first session to start tracking progress.
    </EmptyDescription>
  </EmptyHeader>
  <EmptyContent>
    <Button onClick={...}>Log workout</Button>
  </EmptyContent>
</Empty>
```

### 10.5 Detail row — use `InfoRow`

For profile and settings pages, don't reinvent the icon+label+value row.

```tsx
import { InfoRow } from "@/components/ui/info-row";
import { Mail } from "lucide-react";

<InfoRow icon={Mail} label="Email" value={user.email} />
```

If you need a custom container, wrap `Card` with overrides:

```tsx
<Card className="rounded-none border border-border shadow-none ring-0">
  <CardHeader className="border-b border-border">
    <CardTitle className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
      Account
    </CardTitle>
  </CardHeader>
  <CardContent className="space-y-4 p-0">
    <InfoRow icon={Mail} label="Email" value={user.email} />
    <Separator />
    <InfoRow icon={Calendar} label="Joined" value={user.joinedAt} />
  </CardContent>
</Card>
```

### 10.6 Loading — use `Spinner`

```tsx
import { Spinner } from "@/components/ui/spinner";

<Button disabled>
  <Spinner /> Saving…
</Button>
```

Never roll your own spinner. `Spinner` already has `role="status" aria-label="Loading"`.

### 10.7 Tabs — use `Tabs` with `variant="line"`

```tsx
<Tabs defaultValue="overview">
  <TabsList variant="line">
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="workouts">Workouts</TabsTrigger>
    <TabsTrigger value="meals">Meals</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">...</TabsContent>
</Tabs>
```

`variant="default"` on `TabsList` uses `bg-muted p-[3px] rounded-lg` — that's the rounded-pill register. Always pass `variant="line"` for the scoreboard register.

---

## 11. Worked example — a new section using primitives

You need to add a "Pricing" section to the landing page. Everything in the example is either a primitive or a hairline div — no hand-rolled cards.

```tsx
import {
  Item,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
  ItemMedia,
} from "@/components/ui/item";
import { Separator } from "@/components/ui/separator";
import { buttonVariants } from "@/components/ui/button";
import { ArrowUpRight } from "lucide-react";

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
        {plans.length} tiers
      </span>
    </header>

    {plans.map((plan) => (
      <Item
        key={plan.id}
        variant="outline"
        className="rounded-none border-0 border-b border-border last:border-b-0 px-6 py-6 sm:px-8 sm:py-8"
      >
        <ItemMedia variant="icon" className="rounded-none">
          <plan.Icon className="size-4 text-muted-foreground" aria-hidden="true" />
        </ItemMedia>
        <ItemContent>
          <ItemTitle className="text-base font-medium text-foreground">
            {plan.name}
          </ItemTitle>
          <ItemDescription className="text-sm leading-6 text-muted-foreground">
            {plan.description}
          </ItemDescription>
        </ItemContent>
        <ItemActions>
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
        </ItemActions>
      </Item>
    ))}
  </div>
</section>
```

That's the whole pattern. It recurs across `LandingConsole`, `LandingFeatureGrid`, `LandingRolePaths`, `LandingProof`. Learn it once, repeat it.

---

## 12. Reference

- **Color palette roles**: `src/app/palette.css` (`:root` primitives + light semantics, `.dark`, `.surface-inverted`).
- **Tailwind v4 config**: `src/app/globals.css` (CSS-first config, no `tailwind.config.js`) — the `@theme inline` bridge only.
- **Token contract + how to swap the palette**: `docs/palette.md`. Checks: `pnpm check:design`.
- **shadcn primitives catalog**: `src/components/ui/` — 38 components. See §5.1 for the default-as-is list, §5.2 for the override list, §10 for the patterns.
- **Motion variants**: `src/components/features/landing/landing-variants.ts` — replicate the pattern per feature.
- **Existing reference surfaces** (the system in action):
  - `src/app/[locale]/LandingClient.tsx` — page frame, section rails.
  - `src/components/features/landing/LandingHero.tsx` — display type, metrics.
  - `src/components/features/landing/LandingConsole.tsx` — scoreboard panel, live signal.
  - `src/components/features/landing/LandingFeatureGrid.tsx` — table-as-list.
  - `src/components/features/landing/LandingRolePaths.tsx` — comparison split, monospaced bullets.
  - `src/components/features/landing/LandingProof.tsx` — proof section, single CTA.

When in doubt, open one of these and match it. If you're reaching for a primitive for the first time, read the source at `src/components/ui/<name>.tsx` — the prop API and baked-in styles are the contract.
