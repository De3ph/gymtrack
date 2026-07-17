# Redesign: Athlete → Find Trainers (`/athlete/trainers`)

## Context
GymTrack is a fitness coaching marketplace. This page is where an **athlete (client)** browses and picks a personal trainer, then opens their profile to send a coaching request. Today it renders plain cards (thumbnail + name + a few text lines + stars) — the generic default. The brief: make it feel like a real "find your coach" experience, lead with **avatars**, accept an **image link** (no storage yet) via `next/image`, and keep the existing brand system.

Subject pinned: *athlete browsing rated coaches to shortlist one.* Job: help them compare credibility at a glance and drill into a profile.

## Brand constraints (do not break)
Palette is fixed by `globals.css`: bone `#fafaf9`, ink `#1c1917`, red `#d93535` (primary/CTA), teal `#14b8a6` (accent/availability), stone `#78716c`/`#e7e5e4` (muted/border). Font: **Inter** (loaded). `--font-geist-mono` token exists but is not currently loaded — we add it.

## Design plan

### Color (brand, assigned intent)
- bone `#fafaf9` — page bg · ink `#1c1917` — text/names
- red `#d93535` — rating ring + primary actions · teal `#14b8a6` — "open for clients" signal
- stone `#78716c` — labels/muted · border `#e7e5e4` — dividers

### Type
- **Display/body:** Inter. Names/titles at weight 800, tracking tight (`-0.02em`); body regular. (Brand face — no serif, deliberately avoiding the cream+serif cliché.)
- **Utility/data:** Geist Mono (added to layout) for eyebrows, stat labels, ratings, rates — reads like a coach's program sheet / training log. Deliberate pairing: a trainer's world is numbers.

### Signature — the "rating ring" avatar
Each trainer's **photo is the card's hero, wrapped in an SVG ring whose arc length = average rating (rating/5)** in brand red, over a stone track. A teal **peg/dot** marks `isAvailableForNewClients`. This encodes real credibility *around the person's face* — structure = information, and it's the one memorable element. Everything else stays quiet.

Ring math: `r=46`, `circ=2πr≈289`; `strokeDasharray = circ`, `strokeDashoffset = circ * (1 - rating/5)`. Avatar (`next/image`, `rounded-full`, ~84px) sits centered inside. `aria-label="Rated X out of 5"`.

### Layout — editorial "coach roster"
```
FIND YOUR COACH · ATHLETE CATALOG        (mono eyebrow, red)
Pick the coach who fits                  (Inter 800, tight)
your goals.
Browse rated trainers, then send a request.   (copy)
[ Specialization_____ ] [ Location_____ ] [ Min ★ ▾ ] [ Open only ☐ ] [ Search ]
─────────────────────────────────────────────────────────────
[ ring-avatar ]   [ ring-avatar ]   [ ring-avatar ]
  NAME              NAME              NAME
  STRENGTH TAG     STRENGTH TAG      STRENGTH TAG
  4.8 ★ · 12       4.2 ★ · 9         —
  $40/hr · 6y      $55/hr · 3y       $30/hr
  ● Open           — Unavailable     ● Open
```
Responsive: 1 col mobile → 2 → 3 (lg). Whole card is a link to `DYNAMIC_ROUTES.ATHLETE_TRAINERS_DETAIL(trainer.userId)`.

### Copy (subject-true, active voice)
- Eyebrow: `FIND YOUR COACH` · headline: `Pick the coach who fits your goals.` · sub: `Browse rated trainers, then send a request.`
- Empty: title `No trainers match` / desc `Loosen a filter or clear search to see more coaches.` + Clear button.
- Loading: `Looking for coaches…`
- Stat ledger uses existing keys: `trainer.catalog.rating`, `.reviews`, `common.status.available/unavailable`, `trainer.catalog.currency_symbol`. New minimal keys: `athlete.trainers.eyebrow`, `.headline`, `.subhead`, `.per_hour`, `.years_exp`, `.open_only`, `.empty_title`, `.empty_desc`.

## Files
- `frontend/src/components/features/trainer/TrainerAvatar.tsx` **NEW** — `next/image` from `trainerProfile.profilePhotoUrl` (link) with `onError` → initials fallback; wraps the rating-ring SVG. Reused by card.
- `frontend/src/components/features/trainer/TrainerCatalogCard.tsx` **REWRITE** — ring avatar + name (800) + primary specialty tag (mono) + stat ledger + availability pill; full-card `<Link>`; `focus-visible` ring; `motion-safe` hover lift only.
- `frontend/src/app/[locale]/(dashboard)/athlete/trainers/page.tsx` **REWRITE** — editorial header, restyled filter toolbar (add `availableForNewClients` toggle → passed to `trainerCatalogApi.searchTrainers`), loading/empty states, uses new card. Keep `useEffect` load + `searchTrainers` logic.
- `frontend/src/app/[locale]/layout.tsx` **EDIT** — add `Geist_Mono` via `next/font/google`, expose `--font-geist-mono` so `font-mono` resolves.
- `frontend/messages/en.json` + `tr.json` **EDIT** — add the few new `athlete.trainers.*` keys above (reuse existing where possible).

## Reuse (no reinvention)
- `trainerCatalogApi.searchTrainers` (already supports `specialization, location, minRating, availableForNewClients, limit`).
- `DYNAMIC_ROUTES.ATHLETE_TRAINERS_DETAIL(id)`, `ROUTES.ATHLETE_TRAINERS`.
- Types `TrainerWithProfile` / `TrainerProfile` / `UserProfile` — all fields already present.
- shadcn `Button`, `Input`, `Label` for the toolbar; `Badge` for availability.

## Critique vs generic defaults
- Avoided cream+serif cliché (kept brand Inter, heavy). Avoided plain thumbnail card (ring-gauge avatar instead). Avoided big-number hero (editorial headline + roster). One risk spent on the rating ring; everything else disciplined.

## Verification
- `pnpm dev` → open `/en/athlete/trainers`: layout, 3-col→1-col responsive, hover/focus.
- Empty state: search `zzz` → "No trainers match" + Clear.
- Avatar fallback: set a broken `profilePhotoUrl` → initials render, no broken image.
- `pnpm lint` and `pnpm test` pass.
- Reduced-motion: ring/hover calm under OS setting.
