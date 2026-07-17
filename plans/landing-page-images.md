# Landing Page Images + Minimalist Cleanup

## TL;DR

> **Quick Summary**: Add Unsplash photography to the landing page Hero and RolePath cards, then simplify the background decoration for a cleaner aesthetic — keeping all existing components, the token/color system, and icon-based FeatureGrid untouched.
>
> **Deliverables**:
> - Hero section with 4:3 image in 3-column grid (Text | Image | Console)
> - LandingMetrics moved full-width below hero split
> - Simplified background (grid pattern removed, blur orbs toned down)
> - Athlete/Trainer role cards with embedded photographs
> - LandingProof section with subtle analytics visual
> - Proper image fallback handling (per TrainerAvatar pattern)
>
> **Estimated Effort**: Short
> **Parallel Execution**: YES — 3 waves
> **Critical Path**: Task 1 → Task 3 → Task 5 → Task F1-F4

---

## Context

### Original Request
The landing page has no images — entirely icon/text/CSS based. User wants images added and a more "minimalist clean" look.

### Interview Summary
**Key Decisions**:
- **Hero layout**: Restructure to 3-column grid (HeroText | HeroImage | Console) replacing current 2-column layout
- **LandingMetrics**: Move out of LandingHero, position full-width below the hero split
- **FeatureGrid**: Keep icon-only (no images)
- **LandingConsole**: Keep untouched (no styling changes)
- **Mobile**: Hero image stacks below the text (text → CTA → image → metrics)
- **Image aspect ratio**: 4:3 landscape
- **Background**: Remove CSS grid pattern, tone down blur orbs
- **Image pattern**: Follow existing TrainerAvatar.tsx (next/image with unoptimized + onError fallback)
- **Image source**: Unsplash (user will select specific photos — recommendations provided as suggestions)

**Research Findings**:
- `next/image` used in TrainerAvatar.tsx with `unoptimized` + `onError` fallback to initials
- `images.unoptimized: true` in next.config.ts — no domain whitelist needed
- All landing components exist under `src/components/features/landing/`
- Color palette: red primary (#d93535/#ef4444), teal accent (#14b8a6/#2dd4bf), warm stone neutrals
- Geist font configured via next/font

### Metis Review
**Identified Gaps** (addressed):
- **LandingMetrics inside LandingHero**: Resolved — moving it full-width below hero split
- **Nested grid complexity**: Resolved — 3-column outer grid (Text | Image | Console) replaces 2-column
- **Image loading pattern**: Resolved — follow TrainerAvatar.tsx pattern (unoptimized + onError)
- **Missing test strategy**: Resolved — Playwright agent QA with screenshot evidence

---

## Work Objectives

### Core Objective
Add Unsplash photography to the landing page Hero and RolePath cards, then simplify the background decoration for a cleaner aesthetic — keeping all existing components, the token/color system, and icon-based FeatureGrid untouched.

### Concrete Deliverables
- LandingClient.tsx: 3-column grid layout, simplified background, LandingMetrics positioned full-width
- LandingHero.tsx: Split into text-only section (no image), or refactored to work within new layout
- LandingRolePaths.tsx: Each role card gains a 4:3 image with object-cover + rounded corners + fallback
- LandingProof.tsx: Adds a small analytics-themed image alongside existing content
- Public directory: No new files needed (images served from Unsplash CDN)

### Definition of Done
- [ ] pnpm dev → page loads without errors at localhost:3000
- [ ] Hero image renders at lg+ in right column, 4:3 aspect ratio
- [ ] Hero image stacks below text on mobile
- [ ] RolePath cards each show a photograph
- [ ] Background grid pattern is gone
- [ ] LandingMetrics is positioned below the hero split
- [ ] FeatureGrid is identical to current (no images)
- [ ] Console is identical to current (no changes)
- [ ] Image loading failure shows fallback (not broken icon)

### Must Have
- Unsplash photographs in LandingHero + LandingRolePaths
- Background grid pattern removed from LandingClient.tsx
- 3-column grid layout (Text | Image | Console) at lg+
- Mobile stacking: text → CTA → image → metrics
- Image onError fallback per TrainerAvatar pattern
- LandingMetrics moves full-width below hero
- LandingConsole + LandingFeatureGrid remain unchanged

### Must NOT Have (Guardrails)
- NO changes to LandingHeader
- NO changes to LandingConsole (styling or content)
- NO images added to LandingFeatureGrid (icon-only stays)
- NO new translation keys / i18n changes
- NO new npm dependencies
- NO changes to non-landing-page components or routes
- NO changes to color palette or CSS variables
- NO new page sections (keep the 7 existing components)
- NO propagation of "editorial" design to dashboard pages

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: ✅ (Playwright + Vitest configured)
- **Automated tests**: None (visual/design changes verified via agent QA)
- **Agent QA method**: Playwright browser automation

### QA Policy
Every task includes agent-executed QA scenarios. Evidence saved to `.omo/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Layout/UI**: Playwright — navigate, assert image presence, measure aspect ratios, check responsive breakpoints
- **Dark mode**: Playwright — toggle `.dark` class, screenshot each section
- **Image fallback**: Playwright — mock network error for image URLs, verify placeholder renders
- **Screenshots**: Full-page at 1440px, 768px, 375px viewport widths

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — structural + utility):
├── Task 1: LandingClient.tsx — simplify background + restructure to 3-column grid [quick]
├── Task 2: Create shared ImageWithFallback component [quick]

Wave 2 (After Wave 1 — image integration, MAX PARALLEL):
├── Task 3: LandingHero.tsx — refactor to text-only, move Metrics out [deep]
├── Task 4: LandingRolePaths.tsx — add photos to athlete/trainer cards [unspecified-high]
├── Task 5: LandingProof.tsx — add analytics image [quick]

Wave 3 (After Wave 2 — final landing page assembly):
├── Task 6: LandingClient.tsx — final integration (wire Metrics, position image column) [deep]

Wave FINAL (After ALL tasks — parallel reviews):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Visual QA (unspecified-high + playwright)
├── Task F3: Responsive + dark mode + fallback QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay

Critical Path: Task 1 → Task 3 → Task 6 → F1-F4 → user okay
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 3 (Wave 2)
```

### Dependency Matrix
- **1**: — : 2, 3, 4, 5
- **2**: 1 : 3 (if component exists)
- **3**: 1, 2 : 6
- **4**: 1, 2 : 6
- **5**: 1, 2 : 6
- **6**: 3, 4, 5 : F1-F4
- **F1-F4**: 6 : user okay

### Agent Dispatch Summary
- **Wave 1 (2 tasks)**: T1 → `quick`, T2 → `quick`
- **Wave 2 (3 tasks)**: T3 → `deep`, T4 → `unspecified-high`, T5 → `quick`
- **Wave 3 (1 task)**: T6 → `deep`
- **FINAL (4 tasks)**: F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [ ] 1. **LandingClient.tsx — Simplify background + restructure to 3-column grid**

  **What to do**:
  - Remove the CSS grid pattern background (line 26 in current file): `bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:4.5rem_4.5rem] opacity-[0.18]`
  - Reduce blur orbs opacity: change `bg-primary/15` → `bg-primary/8` and `bg-accent/15` → `bg-accent/8`
  - Change the outer grid from 2-column (`lg:grid-cols-[1.02fr_0.98fr]`) to 3-column (`lg:grid-cols-[1fr_0.8fr_1fr]`) layout for HeroText | HeroImage | Console
  - Add a new `<div>` between `LandingHero` and `LandingConsole` in the grid for the hero image (render a placeholder or the ImageWithFallback from Task 2)
  - Remove `LandingMetrics` from this file (it will be extracted from LandingHero in Task 3)
  - Add a full-width `<div>` below the grid for `LandingMetrics` (wired properly in Task 6)

  **Must NOT do**:
  - Do not modify LandingConsole or its usage
  - Do not change container padding/width settings
  - Do not remove stagger animation wrapper
  - Do not change the `showAuthError` alert

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Structural changes to a single file — grid layout, CSS class modifications, component rearrangement
  - **Skills**: none needed

  **Parallelization**:
  - **Can Run In Parallel**: NO (Wave 1 — foundation for all other tasks)
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 2, 3, 4, 5
  - **Blocked By**: None

  **References**:
  - `src/app/[locale]/LandingClient.tsx:22-56` — Current grid layout and background section — the file to modify
  - `src/components/features/landing/LandingHero.tsx:44` — Current location of LandingMetrics inside LandingHero — needs to be extracted
  - `src/components/features/landing/TrainerAvatar.tsx:82-89` — Image fallback pattern for reference

  **Acceptance Criteria**:
  - [ ] `bg-[linear-gradient(to_right...` pattern NOT present in rendered DOM
  - [ ] Grid uses 3 columns at lg+ (check computed style: grid-template-columns has 3 values)
  - [ ] Blur orbs have reduced opacity (visual check — they should be visibly dimmer)
  - [ ] `LandingMetrics` not rendered inside the hero grid (moved below)

  **QA Scenarios**:
  ```
  Scenario: Background grid pattern is removed
    Tool: Playwright
    Preconditions: Page loaded at 1440px viewport
    Steps:
      1. Navigate to http://localhost:3000
      2. Evaluate: document.querySelector('.container') — verify no gradient background on parent section
      3. Check computed style of the `<section>` element: no linear-gradient background-image
    Expected Result: Background is solid color, no grid lines visible
    Evidence: .omo/evidence/task-1-grid-removed.png

  Scenario: 3-column grid renders at desktop
    Tool: Playwright
    Preconditions: Page loaded, viewport 1440px
    Steps:
      1. Evaluate: getComputedStyle(document.querySelector('.lg\\\\:grid-cols-\\[1fr_0\\.8fr_1fr\\]') || document.querySelector('[class*="grid"]')).gridTemplateColumns
      2. Assert the grid has 3 column values (e.g., "1fr 0.8fr 1fr")
    Expected Result: Grid-template-columns has 3 tracks
    Evidence: .omo/evidence/task-1-3col-grid.txt
  ```

  **Evidence to Capture**:
  - [ ] Screenshot of hero area at 1440px showing 3-column grid
  - [ ] Computed grid-template-columns value

  **Commit**: YES
  - Message: `feat(landing): simplify background and restructure hero to 3-column grid`
  - Files: `frontend/src/app/[locale]/LandingClient.tsx`

---

- [ ] 2. **Create shared ImageWithFallback component**

  **What to do**:
  - Create `src/components/ui/ImageWithFallback.tsx`
  - Follow the TrainerAvatar pattern: `"use client"`, `next/image` with `unoptimized`, `onError` fallback
  - Props: `src: string`, `alt: string`, `aspectRatio?: string` (default `"4/3"`), `className?: string`, `fallback?: ReactNode` (optional custom fallback), `priority?: boolean`
  - Default fallback: a muted div with a dumbbell/gym icon as placeholder
  - Use `cn()` utility for className merging
  - Wrapping container with `aspect-[4/3]` by default to prevent CLS
  - The `fill` prop on next/image inside an aspect-ratio container (position: relative container, Image with fill + object-cover)
  - Handle loading state — use `useState` for `hasError` and `isLoaded`, show fallback until loaded

  **Must NOT do**:
  - Do not add new npm dependencies
  - Do not add i18n strings for alt text
  - Do not add complex animation — simple fade-in on load is fine

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single utility component following existing pattern
  - **Skills**: none needed

  **Parallelization**:
  - **Can Run In Parallel**: NO (Wave 1 — consumed by Tasks 3-5)
  - **Parallel Group**: Wave 1 (after Task 1)
  - **Blocks**: Tasks 3, 4, 5
  - **Blocked By**: Task 1

  **References**:
  - `src/components/features/trainer/TrainerAvatar.tsx:75-95` — Existing image fallback pattern using `unoptimized` + `onError` + `fill` + `sizes`
  - `src/components/ui/` — Directory where shadcn UI primitives live — follow same export pattern
  - `src/lib/utils.ts` — cn() utility
  - `next/image` — Image component with fill, sizes, unoptimized, onError

  **Acceptance Criteria**:
  - [ ] Component file created at `src/components/ui/ImageWithFallback.tsx`
  - [ ] `"use client"` directive present
  - [ ] Props interface defined with TypeScript
  - [ ] Aspect ratio container prevents CLS (layout shift < 0.05)
  - [ ] `onError` callback sets error state → shows fallback UI
  - [ ] Importable as `import { ImageWithFallback } from "@/components/ui/ImageWithFallback"`

  **QA Scenarios**:
  ```
  Scenario: Image loads successfully
    Tool: Playwright
    Preconditions: Component rendered with valid image URL
    Steps:
      1. Mount component in test page
      2. Wait for image to load (wait for the <img> to have naturalWidth > 0)
      3. Assert alt text is present
    Expected Result: Image renders with correct alt text, no fallback visible
    Evidence: .omo/evidence/task-2-image-loaded.png

  Scenario: Image fails to load → fallback renders
    Tool: Playwright
    Preconditions: Component rendered with invalid image URL
    Steps:
      1. Mount component with src="https://invalid.url/image.jpg"
      2. Wait for error event
      3. Assert fallback element is visible (has class indicating fallback)
    Expected Result: Fallback UI (muted div) replaces the image
    Evidence: .omo/evidence/task-2-image-fallback.png
  ```

  **Evidence to Capture**:
  - [ ] Screenshot of successful image load
  - [ ] Screenshot of fallback state

  **Commit**: NO (groups with Task 6 as final assembly commit)

---

- [ ] 3. **LandingHero.tsx — Refactor to text-only + extract LandingMetrics**

  **What to do**:
  - Remove the image/visual role from LandingHero — it's now exclusively the text column
  - Extract `LandingMetrics` from this component: remove the `<LandingMetrics />` call (line 44)
  - LandingMetrics will be rendered in LandingClient.tsx (Task 6)
  - LandingHero becomes a pure text component: badge → headline → description → CTAs (no media, no metrics)
  - Keep the `LazyMotion` wrapper and stagger animation

  **Must NOT do**:
  - Do not change any translation keys
  - Do not change CTA button styles or links
  - Do not remove the stagger animation wrapper
  - Do not modify landing-variants.ts

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Structural refactoring that affects two files and parent layout — need to ensure component extraction is clean
  - **Skills**: none needed

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 2 — independent of Task 4, 5)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 6
  - **Blocked By**: Tasks 1, 2

  **References**:
  - `src/components/features/landing/LandingHero.tsx:1-48` — Current file — full rewrite needed
  - `src/components/features/landing/LandingMetrics.tsx:1-25` — Component being extracted — needs full-width placement
  - `src/components/features/landing/landing-variants.ts` — Animation variants — preserve these

  **Acceptance Criteria**:
  - [ ] LandingHero no longer renders LandingMetrics
  - [ ] LandingHero renders: badge → h1 → p → CTA buttons (in that order)
  - [ ] Stagger animation still works (no errors)
  - [ ] No TypeScript errors (pnpm build passes)

  **QA Scenarios**:
  ```
  Scenario: LandingHero shows only text content
    Tool: Playwright
    Preconditions: Page loaded
    Steps:
      1. Navigate to http://localhost:3000
      2. Assert h1 element exists (hero title)
      3. Assert description paragraph exists
      4. Assert CTA buttons exist (at least 2)
      5. Assert stats/metrics values NOT present inside the hero grid area
    Expected Result: Hero section has headline + description + CTAs. No metrics in hero area.
    Evidence: .omo/evidence/task-3-hero-text-only.png

  Scenario: Stagger animation plays on load
    Tool: Playwright
    Preconditions: Page loaded
    Steps:
      1. Check that motion animation attributes are applied
      2. Verify stagger children render in sequence
    Expected Result: Animation plays without console errors
    Evidence: .omo/evidence/task-3-animation.txt
  ```

  **Evidence to Capture**:
  - [ ] Screenshot of hero text-only area
  - [ ] Console errors check

  **Commit**: NO (groups with Task 6)

---

- [ ] 4. **LandingRolePaths.tsx — Add photos to athlete/trainer cards**

  **What to do**:
  - Import `ImageWithFallback` from `@/components/ui/ImageWithFallback`
  - Add an image to each role card (athlete and trainer)
  - Place the image in the top-right corner of each card, overlapping the card boundary slightly for visual interest
  - Use 4:3 aspect ratio container, ~160px wide on desktop
  - Style: `object-cover`, rounded corners (`rounded-xl`), subtle shadow
  - Add `onError` fallback via ImageWithFallback
  - Keep existing content: kicker, title, description, bullet points, CTA
  - Suggested Unsplash photo URLs (replaceable by user later):
    - Athlete: `https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=80`
    - Trainer: `https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80`
  - Alt text: `"Athlete training with weights"` / `"Trainer coaching a client"`

  **Must NOT do**:
  - Do not change the card layout (grid, padding, border radius, shadow)
  - Do not remove or change bullet points, kicker, or CTA
  - Do not change `roleKeys` array or translations
  - Do not add images to any other section

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Moderate complexity — integrating images into existing cards while preserving layout
  - **Skills**: none needed

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 2 — independent of Task 3, 5)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 6
  - **Blocked By**: Tasks 1, 2

  **References**:
  - `src/components/features/landing/LandingRolePaths.tsx:1-53` — Current file — images added to each `<motion.article>`
  - `src/components/features/landing/LandingConsole.tsx:38-71` — Reference for card structure patterns
  - `src/components/ui/ImageWithFallback.tsx` — New component from Task 2

  **Acceptance Criteria**:
  - [ ] Both role cards contain an `<img>` element
  - [ ] Each `<img>` has an `alt` attribute (not empty)
  - [ ] Image positioned at top-right of card (check with Playwright bounding box)
  - [ ] Image has 4:3 aspect ratio (aspect-4/3 or computed dimensions ~3:4 ratio)
  - [ ] Image fallback renders on error
  - [ ] Card content (kicker, title, description, bullets, CTA) is preserved and readable

  **QA Scenarios**:
  ```
  Scenario: Role cards display images at desktop
    Tool: Playwright
    Preconditions: Page loaded at 1440px viewport
    Steps:
      1. Navigate to http://localhost:3000
      2. Scroll to role cards section
      3. Assert exactly 2 role cards visible
      4. For each card: assert an <img> element exists
      5. For each card: assert alt attribute is non-empty
      6. Assert image is positioned in the card (bounding box is within card bounds)
    Expected Result: Each role card shows a photograph at top-right with descriptive alt text
    Evidence: .omo/evidence/task-4-role-cards-images.png

  Scenario: Role card image fallback on error
    Tool: Playwright
    Preconditions: Mock network to block image load
    Steps:
      1. Intercept image requests and return 404
      2. Navigate to http://localhost:3000
      3. Scroll to role cards
      4. Assert fallback element is visible where image would be
    Expected Result: Fallback placeholder renders instead of broken image
    Evidence: .omo/evidence/task-4-role-cards-fallback.png

  Scenario: Card content preserved with images
    Tool: Playwright
    Preconditions: Page loaded
    Steps:
      1. Navigate to http://localhost:3000
      2. Scroll to role cards section
      3. Assert kicker text is visible
      4. Assert title is visible
      5. Assert description is visible
      6. Assert CTA link is visible
    Expected Result: All card content is present and readable, images don't overlap text
    Evidence: .omo/evidence/task-4-content-preserved.png
  ```

  **Evidence to Capture**:
  - [ ] Screenshot of both role cards with images at 1440px
  - [ ] Screenshot of fallback state
  - [ ] Screenshot showing content is preserved

  **Commit**: NO (groups with Task 6)

---

- [ ] 5. **LandingProof.tsx — Add analytics/visual element**

  **What to do**:
  - Import `ImageWithFallback` from `@/components/ui/ImageWithFallback`
  - Add a small analytics-themed image to the right side of the existing content
  - Suggested image: `https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&q=80` (abstract analytics/progress visual)
  - Alt text: `"Progress tracking analytics illustration"`
  - Image dimensions: ~200px wide, 4:3 aspect ratio, rounded corners
  - Position: right side in the lg grid (currently `lg:grid-cols-[1fr_auto]`), beside the CTA
  - On mobile: image stacks below CTA
  - Ensure dark mode readability — add a subtle white glow/shadow if needed on the image

  **Must NOT do**:
  - Do not change the dark block background or text colors
  - Do not change kicker, title, description, or CTA link
  - Do not change the grid layout for the text column

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple addition of an image element to an existing layout
  - **Skills**: none needed

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 2 — independent)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 6
  - **Blocked By**: Tasks 1, 2

  **References**:
  - `src/components/features/landing/LandingProof.tsx:1-38` — Current file — add image beside CTA in the right grid column
  - `src/components/ui/ImageWithFallback.tsx` — New component from Task 2

  **Acceptance Criteria**:
  - [ ] LandingProof section contains an `<img>` element
  - [ ] `<img>` has non-empty `alt` attribute
  - [ ] Image is visible at lg+ (right side of grid)
  - [ ] Image stacks below CTA on mobile
  - [ ] Image has fallback on error

  **QA Scenarios**:
  ```
  Scenario: Proof section shows analytics image at desktop
    Tool: Playwright
    Preconditions: Page loaded at 1440px viewport
    Steps:
      1. Navigate to http://localhost:3000
      2. Scroll to the dark proof section (look for text containing proof title)
      3. Assert an <img> element exists
      4. Assert alt attribute is non-empty
      5. Assert image bounding box is within the section
    Expected Result: Analytics-styled image renders beside the CTA
    Evidence: .omo/evidence/task-5-proof-image.png

  Scenario: Image stacks below CTA on mobile
    Tool: Playwright
    Preconditions: Viewport 375px
    Steps:
      1. Navigate to http://localhost:3000
      2. Scroll to proof section
      3. Assert CTA button is above the image in DOM order
    Expected Result: CTA renders before image on mobile
    Evidence: .omo/evidence/task-5-mobile-stack.png
  ```

  **Evidence to Capture**:
  - [ ] Screenshot of proof section at 1440px
  - [ ] Screenshot at 375px showing stacked layout

  **Commit**: NO (groups with Task 6)

---

- [ ] 6. **LandingClient.tsx — Final integration (wire Metrics, position image column)**

  **What to do**:
  - This task completes the 3-column assembly in LandingClient.tsx
  - Tasks 1-5 have created the building blocks; this wires them together
  - Import `LandingMetrics` back into LandingClient.tsx (moved from LandingHero in Task 3)
  - Import `ImageWithFallback` from `@/components/ui/ImageWithFallback`
  - Place `ImageWithFallback` in the middle column of the 3-column grid (between LandingHero and LandingConsole)
  - Suggested hero image: `https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80` (dramatic gym interior)
  - Hero image alt text: `"Modern gym training facility with equipment"`
  - Style the image column: 4:3 aspect ratio via the ImageWithFallback component, `object-cover`, rounded-2xl, subtle shadow, slight negative margin or overlap for visual interest
  - Place `<LandingMetrics />` in a full-width div below the 3-column grid
  - Add responsive classes: on mobile (below lg), metrics below image, image below text; on lg+, metrics full-width below the grid
  - Ensure stagger animation from `landing-variants.ts` still wraps everything

  **Must NOT do**:
  - Do not change LandingConsole import or usage
  - Do not change the `showAuthError` alert
  - Do not change LandingHeader

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Final assembly requires careful coordination of all previous tasks — layout, responsive, animations
  - **Skills**: none needed

  **Parallelization**:
  - **Can Run In Parallel**: NO (Wave 3 — depends on all Wave 2 tasks)
  - **Parallel Group**: Wave 3
  - **Blocks**: F1-F4
  - **Blocked By**: Tasks 3, 4, 5

  **References**:
  - `frontend/src/app/[locale]/LandingClient.tsx` — Target file — final assembly
  - `src/components/ui/ImageWithFallback.tsx` — Image component from Task 2
  - `src/components/features/landing/LandingHero.tsx` — Text-only hero from Task 3
  - `src/components/features/landing/LandingMetrics.tsx` — Metrics moved out of hero
  - `src/components/features/landing/LandingRolePaths.tsx` — Role cards with images from Task 4
  - `src/components/features/landing/LandingProof.tsx` — Proof section with image from Task 5

  **Acceptance Criteria**:
  - [ ] pnpm dev → page loads without compilation errors
  - [ ] 3-column grid renders: Hero text | Hero image | Console at lg+
  - [ ] LandingMetrics renders full-width below the 3-column grid
  - [ ] On mobile: text → CTA → image → metrics (proper stacking order)
  - [ ] All images have `onError` fallback via ImageWithFallback
  - [ ] All alt text is non-empty
  - [ ] FeatureGrid (unchanged) is below the hero split
  - [ ] RolePaths with images is below FeatureGrid
  - [ ] Proof with image is below RolePaths
  - [ ] Console is identical to original (no visual changes)

  **QA Scenarios**:
  ```
  Scenario: Full page renders with all sections at desktop
    Tool: Playwright
    Preconditions: Viewport 1440px
    Steps:
      1. Navigate to http://localhost:3000
      2. Wait for all images to load (wait for network idle)
      3. Take full-page screenshot
      4. Assert header is visible
      5. Assert hero text column exists (h1 with title)
      6. Assert hero image column exists (img in middle column)
      7. Assert console is in right column
      8. Assert metrics bar is full-width below the grid
      9. Assert feature grid (4 cards, no images)
      10. Assert role paths (2 cards, each with images)
      11. Assert proof section with image
    Expected Result: Complete page renders with all 7 sections in correct layout
    Evidence: .omo/evidence/task-6-full-page-desktop.png

  Scenario: Mobile stacking order is correct
    Tool: Playwright
    Preconditions: Viewport 375px
    Steps:
      1. Navigate to http://localhost:3000
      2. Assert DOM order: LandingHero text first
      3. Assert CTA buttons before hero image
      4. Assert hero image before metrics
      5. Assert metrics before FeatureGrid
      6. Assert no image appears in FeatureGrid cards
    Expected Result: Mobile stacking matches: text → CTA → image → metrics
    Evidence: .omo/evidence/task-6-mobile-stack.png

  Scenario: Dark mode preserves image visibility
    Tool: Playwright
    Preconditions: Page loaded
    Steps:
      1. Add class "dark" to <html> element via page.evaluate
      2. Navigate to http://localhost:3000 (or re-render)
      3. Assert all images are visible (no clipping, correct dimensions)
      4. Assert text readability: hero text, metrics, feature titles, role content
    Expected Result: Images and text are clearly visible in dark mode
    Evidence: .omo/evidence/task-6-dark-mode.png

  Scenario: No Console or FeatureGrid regressions
    Tool: Playwright
    Preconditions: Page loaded
    Steps:
      1. Navigate to http://localhost:3000
      2. In LandingConsole: assert 4 feature items exist (Dumbbell, Apple, Ruler, Users icons)
      3. In LandingFeatureGrid: assert 4 cards exist, each with an SVG icon (not img tag)
      4. Assert no <img> inside FeatureGrid section
    Expected Result: Console and FeatureGrid are unchanged from original
    Evidence: .omo/evidence/task-6-no-regression.png
  ```

  **Evidence to Capture**:
  - [ ] Full-page screenshot at 1440px
  - [ ] Mobile screenshot at 375px
  - [ ] Dark mode screenshot
  - [ ] FeatureGrid/Console unchanged evidence

  **Commit**: YES
  - Message: `feat(landing): add Unsplash images and finalize minimalist layout`
  - Files: `frontend/src/app/[locale]/LandingClient.tsx frontend/src/components/ui/ImageWithFallback.tsx frontend/src/components/features/landing/LandingHero.tsx frontend/src/components/features/landing/LandingRolePaths.tsx frontend/src/components/features/landing/LandingProof.tsx`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. Verify:
  - Background grid pattern removed from LandingClient.tsx
  - 3-column grid layout (Text | Image | Console) at lg+
  - ImageWithFallback component created (unoptimized + onError fallback)
  - LandingMetrics moved full-width below hero grid
  - RolePaths cards contain images with alt text
  - Proof section contains analytics image
  - FeatureGrid unchanged (no img elements)
  - Console unchanged
  - No changes to LandingHeader
  Check evidence files in .omo/evidence/.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Visual QA** — `unspecified-high` (+ `playwright` skill)
  Start from `pnpm dev` clean state. Open http://localhost:3000 at 1440px.
  - Execute EVERY QA scenario from Tasks 1-6
  - Full-page screenshot at 1440px, 768px, 375px
  - Check image aspect ratios (should be ~4:3)
  - Check image alt text presence
  - Check no broken images
  - Check Console and FeatureGrid are identical to original
  Save screenshots to `.omo/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | VERDICT`

- [ ] F3. **Responsive + Dark Mode + Fallback QA** — `unspecified-high`
  - Responsive: 375px (check stacking: text → CTA → image → metrics), 768px (tablet layout), 1440px (3-column grid)
  - Dark mode: Toggle `.dark` class, screenshot each section. Check image visibility and text contrast.
  - Image fallback: Use Playwright route interception to block image URLs → verify fallback renders (no broken image icon)
  Output: `Responsive [3/3 pass] | Dark mode [N sections] | Fallback [PASS/FAIL] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify:
  - Everything specified was built (no missing features)
  - Nothing beyond spec was built (no scope creep)
  - Check "Must NOT do" compliance per task
  - Detect cross-task contamination (Task N touching Task M's files unexpectedly)
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | VERDICT`

---

## Commit Strategy

- **Task 1**: `feat(landing): simplify background and restructure hero to 3-column grid` - `frontend/src/app/[locale]/LandingClient.tsx`
- **Task 6** (bulk): `feat(landing): add Unsplash images and finalize minimalist layout` - `frontend/src/app/[locale]/LandingClient.tsx frontend/src/components/ui/ImageWithFallback.tsx frontend/src/components/features/landing/LandingHero.tsx frontend/src/components/features/landing/LandingRolePaths.tsx frontend/src/components/features/landing/LandingProof.tsx`

---

## Success Criteria

### Verification Commands
```bash
cd frontend && pnpm dev  # Expected: dev server starts on port 3000
cd frontend && pnpm build  # Expected: build succeeds with no TypeScript/lint errors
```

### Final Checklist
- [ ] All images render with correct alt text
- [ ] 3-column grid at 1440px (Text | Image | Console)
- [ ] Mobile stacking: text → CTA → image → metrics
- [ ] Background grid pattern removed (no gradient lines visible)
- [ ] LandingMetrics full-width below hero
- [ ] RolePath cards show photographs
- [ ] Proof section has analytics image
- [ ] ImageWithFallback handles errors gracefully
- [ ] FeatureGrid unchanged (icon-only)
- [ ] Console unchanged
- [ ] LandingHeader unchanged
- [ ] All "Must NOT Have" guardrails respected
- [ ] No TypeScript or build errors


