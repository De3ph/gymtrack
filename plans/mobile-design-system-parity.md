# Mobile — Frontend Design-System Parity

Branch: `feature/mobile/design-parity`
Status: planning
Source of truth: `frontend/DESIGN.md` + `frontend/src/app/globals.css`

## Context

The web frontend has a formal, enforced design register documented in `frontend/DESIGN.md`. The Expo app (`mobile/`) was built independently and shares almost none of that language: blue instead of red, gray instead of stone, rounded cards with shadows instead of square hairline panels, system bold instead of mono display, and MaterialCommunityIcons instead of lucide.

Goal: make the native app read as the same product as the web app — same color signals, same type system, same flat/square register — while keeping the Expo/native stack.

### Decisions (locked)

1. **Color**: adopt frontend palette — red primary, teal accent, stone neutrals, amber warning.
2. **Presentation layer**: **keep `@expo/ui`** native trees; apply tokens only. Accept that native `Button`/pickers keep OS shape (partial fidelity).
3. **Icons**: `lucide-react-native`, replacing `@expo/vector-icons` MaterialCommunityIcons.
4. **Sequence**: foundation first (Phases 0–5), then migrate screens domain by domain.

---

## The frontend register (target)

Grounded in `frontend/DESIGN.md`:

- **Flat** — 1px hairlines, no shadows.
- **Square** — `rounded-none` default; `rounded-sm` inputs only; `rounded-full` only the live pulse dot.
- **Mono where data lives** — Geist Mono for display, labels, kickers, CTAs, numbers.
- **Quiet elsewhere** — Inter body in `foreground` / `muted-foreground` only.
- **Signal economy** — one signal color per section. Red (`primary`) and teal (`accent`) are signals, not decoration.
- **No `font-bold` / `font-extrabold` / `font-black`** anywhere. Max weight 600.
- **No decoration without a role** — no gradient blobs, no ambient atmosphere, no stock imagery.

### Token map (frontend → mobile)

| Semantic | Light | Dark | Role |
|---|---|---|---|
| `background` | stone-50 `#fafaf9` | stone-950 `#0c0a09` | Page surface |
| `foreground` | stone-900 `#1c1917` | stone-200 `#e7e5e4` | Primary text |
| `card` | `#ffffff` | stone-900 `#1c1917` | Panel surface |
| `primary` | red-600 `#dc2626` | red-500 `#ef4444` | One filled action per view |
| `primary-foreground` | `#ffffff` | `#ffffff` | Text on primary |
| `accent` | teal-500 `#14b8a6` | teal-400 `#2dd4bf` | Active / connected only |
| `accent-foreground` | stone-950 | stone-950 | Text on accent |
| `destructive` | red-600 | red-400 `#f87171` | Errors / destructive |
| `border` | stone-200 `#e7e5e4` | stone-800 `#292524` | Hairlines |
| `muted` | stone-200 | stone-700 `#44403c` | Hover / disabled / secondary surface |
| `muted-foreground` | stone-500 `#78716c` | stone-400 `#a8a29e` | Labels, kickers, secondary text |
| `ring` | red-600 | red-500 | Focus |

> Native React Native does not reliably support `oklch()`. Use the hex equivalents (already recorded as comments in `frontend/src/app/globals.css`). Keep the two-tier structure (primitives + semantic).

### Type scale (target)

| Role | Family | Weight | Size | Tracking |
|---|---|---|---|---|
| Display | Geist Mono | 500 | 24–56 | -0.04em |
| Heading | Inter | 600 | 16–24 | default |
| Body | Inter | 400–500 | 14–16 | default |
| Label / eyebrow / data | Geist Mono | 500 | 10–12 | uppercase, ~0.18em |
| Numeric | Geist Mono | 600 | 30–48 | tight |

RN notes: `letterSpacing` is px, not `em` — `0.18em` at 11px ≈ `2px`, `-0.04em` at 32px ≈ `-1.3px`. Line-height pairs to size as in `frontend/DESIGN.md` §3.2.

---

## Current mobile state (gap)

| Dimension | Frontend | Mobile now |
|---|---|---|
| Neutral | stone (warm) | Tailwind gray |
| Primary signal | red-600 | blue `#2563eb` |
| Accent/active | teal | — (blue reused) |
| Warning / success | amber / teal | amber `#d97706` / green `#16a34a` |
| Invite | — | violet `#7c3aed` |
| Radius | none | `rounded-xl/2xl/3xl/full` — 106 hits / 31 files |
| Shadow | none | `shadow-sm` + `shadow-lg` on auth |
| Fonts | Inter + Geist Mono | only SpaceMono loaded; `font-sans/mono/body` unmapped |
| Weight | ≤600 | `font-bold/extrabold/black` — 195 hits / 32 files |
| Data text | mono 600 | system |
| Icons | lucide (stroke, currentColor) | MaterialCommunityIcons |
| Primitives | shadcn + `Item`/`Empty`/`InfoRow` | gluestack + `@expo/ui` mix |

**Key files**: `mobile/global.css`, `mobile/src/constants/Colors.ts`, `mobile/src/lib/colors.ts`, `mobile/src/components/useThemeColors.ts`, `mobile/src/components/ui/{text,heading,card,badge,modal,input,divider}/*`, `mobile/src/components/icons/index.tsx`, `mobile/src/stores/themeStore.ts`, `mobile/app/_layout.tsx`.

### Constraints & resolutions

1. **`--accent` naming — resolved (Option A).** The "collision" is only a comment: no gluestack component references `accent`, and no `bg-accent` / `text-accent` / `border-accent` / `accent-foreground` / `accent-<step>` utility is used anywhere in code. `mobile/src/components/dom/globals.css` (which defines an HSL `--accent` subtle surface) is orphaned — nothing imports it. We therefore take `--accent` for the teal signal with zero consumer churn. See "Accent resolution (Option A)" below.
2. **`@expo/ui` native trees (29 files).** `Host` / `Column` / `Row` / `Text` / `Button` / `Spacer` render native SwiftUI/Compose. `Text` accepts `textStyle`, so typography and color port; native `Button`/pickers cannot be squared or mono-fied. We keep them and accept the limit, preferring a styled RN `Pressable` for the single primary CTA per screen where the register matters.

### Accent resolution (Option A)

Adopt frontend's meaning of `accent` = teal signal and claim the token outright, since nothing consumes the old subtle-surface value.

Evidence:
- `grep accent mobile/src/components/ui` → **0 matches** (no vendored gluestack component references it).
- No `bg-accent` / `text-accent` / `border-accent` / `ring-accent` / `accent-foreground` / `accent-<step>` usage in any `.ts/.tsx/.js/.jsx`.
- `mobile/src/components/dom/globals.css` is dead (not imported).

Steps:
1. In `mobile/global.css`, redefine the semantic token to teal (space-separated `R G B` triples):
   ```css
   /* :root — light */
   --accent: 20 184 166;          /* teal-500 #14b8a6 */
   --accent-foreground: 12 10 9;  /* stone-950 */
   /* .dark / :root.dark */
   --accent: 45 212 191;          /* teal-400 #2dd4bf */
   --accent-foreground: 12 10 9;  /* stone-950 */
   ```
2. Rename the primitive blue ramp `--color-accent-50…900` → `--color-teal-50…900`, using the teal hex ramp from `frontend/src/app/globals.css`. Keep `--color-accent: rgb(var(--accent))` and `--color-accent-foreground`.
3. Delete `mobile/src/components/dom/globals.css` (orphan).
4. Correct the misleading note in `mobile/global.css` (current lines 18–23) that says not to introduce `--color-accent`.
5. Neutral hover/selected surfaces use `bg-muted` / `bg-secondary` — never `bg-accent`.
6. `mobile/src/constants/Colors.ts`: `accent` becomes teal (was brand blue). The brand-blue role it used to fill is now `primary` (red). Audit the 3 `colors.accent` consumers (`WorkoutCard.tsx:229`, `QuickActions.tsx:81`, `DetailBackHeader.tsx:37`) during Phase 6.

---

## Plan

### Phase 0 — Contract & guardrails

- Write `mobile/DESIGN.md`: native adaptation of `frontend/DESIGN.md` (§1–§12), with an explicit "native limitations" section covering `@expo/ui`, px tracking, `StyleSheet.hairlineWidth`, and hex-instead-of-OKLCH.
- Link `mobile/DESIGN.md` from `mobile/AGENTS.md` (which currently only carries the Expo version note).
- Add a lint guard (ESLint `no-restricted-syntax` or a small script) flagging in `src/components/features`:
  - `font-bold|font-extrabold|font-black`
  - `rounded-xl|rounded-2xl|rounded-3xl`
  - `shadow-sm|shadow-md|shadow-lg|shadow-xl`

### Phase 1 — Tokens

- `mobile/global.css`: replace primitive ramps with frontend hex ramps (stone / red / teal / amber). Keep the space-separated `R G B` triplet convention already used (`rgb(var(--x))`).
- Rename the primitive blue ramp `--color-accent-50…900` → `--color-teal-50…900` (frontend hue name) and keep the semantic `--color-accent` mapping.
- Remap the semantic tier exactly per the token table above; add `primary`, `accent` (= teal), `ring`, `chart-1..5`.
- Apply **Accent resolution (Option A)**: set `--accent` = teal-500/400 and `--accent-foreground` = stone-950, delete the orphan `mobile/src/components/dom/globals.css`, and correct the stale warning comment that says not to introduce `--color-accent`. No gluestack component patching is needed.
- `mobile/src/constants/Colors.ts`: re-point `light` / `dark` values to the new palette. Keep existing key names (`text`, `textSecondary`, `card`, `border`, `danger`, `success`, `warning`, `invite`, …) to limit churn, and add `primary`, `primaryOn`(=`onAccent`), `accent` (teal), `accentOnLight`, `mutedForeground`. Document the name → token mapping in a header comment.
- `mobile/src/lib/colors.ts` and `mobile/src/components/useThemeColors.ts`: surface the added tokens; no API shape change.
- Preserve `themeStore` + `Appearance` light/dark switching; keep `:root.dark` / `prefers-color-scheme`.

### Phase 2 — Typography

- Load **Inter (400/500/600)** and **Geist Mono (400/500/600)**. Preferred: `@expo-google-fonts/inter` and `@expo-google-fonts/geist-mono`; fallback: bundle TTFs under `mobile/assets/fonts/`.
- `mobile/app/_layout.tsx`: add fonts to `useFonts`; keep the existing SpaceMono only if still needed for code surfaces, otherwise remove.
- `mobile/global.css` `@theme`: map `--font-sans` = Inter, `--font-body` = Inter, `--font-heading` = Inter, `--font-mono` = Geist Mono.
- New `mobile/src/lib/typography.ts` — single vocabulary exported in **both** forms so `@expo/ui` `Text` (`textStyle`) and gluestack/NativeWind (`className`) share one scale:
  - `className`: `display`, `heading`, `body`, `label`, `numeric`
  - `textStyle`: the same five as `TextStyle` objects
- Fix `mobile/src/components/ui/text/styles.tsx`, `text.tsx`, `text/index.tsx`, `heading/styles.tsx`: drop `bold`/`extrabold` defaults and the `font-bold` base, add mono + label/numeric variants, uppercase label tracking in px.

### Phase 3 — Radii, borders, primitives

- Set the radius scale ≈ 0.
- Restyle `mobile/src/components/ui/card/styles.tsx` → `rounded-none shadow-none border border-border`.
- `badge/index.tsx` → square, uppercase mono label, no pill.
- `modal/index.tsx`, `alert-dialog/index.tsx` → `rounded-none`, no shadow.
- `input/index.tsx` → allowed `rounded-sm` (frontend §3.4 input exception).
- `avatar/index.tsx` → keep `rounded-full` (user avatars only).
- Add mobile analogs of the frontend patterns:
  - hairline panel (bordered container + internal hairlines)
  - `Item`-shaped row (icon + title + optional description + value/action)
  - `Empty` state
  - `InfoRow`
  - `Separator` (wrap gluestack Divider)
- Tab bar (`mobile/app/(tabs)/_layout.tsx`): hairline top border, drop `elevation: 8` on Android, labels → mono uppercase, no bold.

### Phase 4 — Icons

- Add `lucide-react-native` (react-native-svg already a dependency).
- Re-implement the wrappers in `mobile/src/components/icons/index.tsx` over lucide so existing consumers keep compiling, then migrate the gluestack icon set in `mobile/src/components/ui/icon`.
- Enforce stroke (`currentColor`, no `stroke-width` overrides) and the size ladder 12 / 14 / 16 / 20.

### Phase 5 — Motion

- New `mobile/src/lib/motion.ts` with `reveal` / `card` / `stagger` equivalents using Reanimated and `ReduceMotion` (honours OS reduced-motion).
- Replace ad-hoc animations in feature screens with these three named variants.

### Phase 6 — Screen migration (domain by domain)

Order: dashboard → workouts → meals → measurements → trainer/* → profile → auth → coaching → comments → workout-plan → common.

Per screen:
- Swap blue → red / teal / amber tokens.
- Apply `typography.ts` variants (mono display, Inter headings, mono labels/numerics).
- Remove bold / rounded-xl+ / shadows; square icon containers; replace pill badges.
- Replace MaterialCommunityIcons with lucide via the wrapper.
- Keep `@expo/ui` layout trees; convert rounded card lists to hairline panels where the tree is RN-side.

High-signal fixes already identified:
- `LoginScreen.tsx`: `rounded-3xl shadow-lg font-black font-extrabold font-bold rounded-xl tracking-[3px]` → auth register (thin primary rail, mono uppercase kicker, no logo blob) matching `frontend/src/app/[locale]/(auth)/layout.tsx`.
- `RecentActivityCard.tsx`: `borderRadius: 16`, `fontWeight: "bold"`, pill badge → square hairline card, mono numeric.
- `WorkoutCard.tsx`: `rounded-2xl`, `rounded-full` icon bubble, `font-semibold` → square hairline row, mono date/numerics.

### Phase 7 — Verification

- `cd mobile && pnpm lint`, `pnpm exec tsc --noEmit`.
- Run iOS + Android in light and dark; screenshot parity against the web equivalents.
- Confirm `.maestro` flows still pass.
- Grep sweep: zero `font-bold|font-extrabold|font-black`, zero `rounded-xl|2xl|3xl`, zero `shadow-*`, zero raw hex in `src/components/features`.

---

## Deliverables

- `mobile/DESIGN.md` (register contract).
- Updated `mobile/global.css`, `mobile/src/constants/Colors.ts`.
- New `mobile/src/lib/typography.ts`, `mobile/src/lib/motion.ts`.
- Restyled `mobile/src/components/ui/*` primitives.
- lucide-backed `mobile/src/components/icons`.
- Migrated feature screens under `mobile/src/components/features/*`.

## Known limits (accepted)

- Native `@expo/ui` `Button` / date/time pickers keep OS shape and cannot be fully squared/mono-fied.
- RN inline styles use hex, not OKLCH; the OKLCH ramps remain documentation-only on native.
- The native tab bar can only port border, background, and label styling — not a DOM hairline.
- Native text rendering differs from web; type sizes may need ±1px tuning per platform.

## Success criteria

- A user moving from the web app to the mobile app sees the same color signals, same type hierarchy, and the same flat/square register.
- No forbidden pattern (`font-bold+`, large radii, shadows, raw hex) remains in feature code.
- Light and dark themes both pass a contrast check for text on background.
- All checks in `frontend/DESIGN.md` §9 have a mobile equivalent that passes.
