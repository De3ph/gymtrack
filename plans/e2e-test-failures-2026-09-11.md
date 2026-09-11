# E2E Playwright Test Failures — 2026-09-11

Date: Fri Sep 11 2026
Command: `pnpm test:e2e` (run from `frontend/`)
Config: `frontend/playwright.config.ts` — projects: chromium, firefox, webkit, Mobile Chrome (300 tests total)
Reporter: html (report not generated — run was terminated before completion)

## Setup issue

Port 8080 was occupied by the running Go backend (which does not expose `/api/health`),
so Playwright could not start/reuse its mock backend (`mock-backend/server.js` → EADDRINUSE).
The Go dev server was stopped (PID 4152) before running the suite. **It was not restarted.**

## Run status

- 300 tests planned; run terminated by shell timeout at test **264/300**.
- **71 failures captured** (1–71 below).
- Not executed: Mobile Chrome tail (REL.F4–F6, all Mobile Chrome track.spec tests).
- Full stdout saved: `C:\Users\hamit\.local\share\opencode\tool-output\tool_090396d99001ZPkrW1k7YEShLS`
- Per-test artifacts: `frontend/test-results/`

---

## Failures by category

### 1. Navigation hangs — pages never finish loading (30s `page.goto` timeout / `net::ERR_ABORTED`)

| Test | Route | Browsers |
|---|---|---|
| REL.4 – View my coaching requests | `/athlete/requests` | chromium |
| REL.6 – View my-trainer detail | `/athlete/my-trainer/42` | chromium (ERR_ABORTED) |
| REL.11 – Edit own review | `/athlete/trainers/42` | chromium, firefox, webkit |
| REL.12 – Delete own review | `/athlete/trainers/42` | chromium, firefox, webkit |
| REL.F1 – Coaching message optional | `/athlete/trainers/42` | chromium |

Symptom: `page.goto: Test timeout of 30000ms exceeded` while waiting for `load`.
Likely an infinite/hanging data fetch on those pages (mock route not responding or page keeps loading).

### 2. AUTH.6 – Logout (all 4 browsers)

Waits forever for avatar menu button `getByRole('button', { name: 'TA' })` — never appears.
Test: `auth.spec.ts:82` — clicks `getByRole("button", { name: "TA" })` then `menuitem` "Logout".

### 3. AUTH.10 – Locale Switch (firefox)

`getByRole('heading', { name: /Train smarter/i })` not found after switching locale.

### 4. AUTH.F1 – Login identifier required (webkit)

Alert `Email or username is required` never rendered after submit.

### 5. PLAN.1 / PLAN.2 – Create/Edit workout plan (firefox)

`expect(getByRole('dialog')).toBeHidden()` fails — dialog stays visible after submit.
Indicates plan create/edit mutation or dialog-close logic broken on firefox.

### 6. REL.7 – Terminate relationship (firefox)

After termination, URL stayed `/trainer/client/testclient`; expected `/trainer/clients`.

### 7. REL.F6 – Review comment max (chromium, webkit)

`locator.click: Element is outside of the viewport`.

### 8. TRACK delete-flow — empty state never appears (all browsers)

| Test | Expected text | Browsers |
|---|---|---|
| TRACK.3 – Delete workout | `No workouts recorded yet` | chromium, webkit (firefox = timeout) |
| TRACK.8 – Delete meal | `No meals recorded yet` | all 3 |
| TRACK.13 – Delete measurement | `/measurements recorded yet/i` | all 3 (webkit = 30s timeout) |

Symptom: deleting the last record does not trigger the empty-state render.

### 9. TRACK meal form validations — strict-mode violation (all browsers)

`getByRole('alert')` resolves to **2 elements** (global error banner + field-level `data-slot="field-error"` alert):
- TRACK.F8 – Food name is required
- TRACK.F9 – Quantity is required
- TRACK.F10 – Calories cannot be negative

Tests use `page.getByRole("alert").filter({ hasText: ... })` which becomes ambiguous.

### 10. TRACK.F14 / TRACK.F19 – Invalid time format (all browsers)

Alert `Invalid time format` never rendered after entering bad time. Time validation missing or message key different.

### 11. TRACK.F17 – Measurement parts range (all browsers)

Alert `Value is unrealistically large` never rendered.

### 12. TRACK measurements happy path (all browsers)

| Test | Symptom |
|---|---|
| TRACK.11 – Create body measurement | History tab `aria-selected` stays `"false"` after switching (`toHaveAttribute("aria-selected","true")` fails) |
| TRACK.14 – View measurement charts | `svg.recharts-surface` never appears |
| TRACK.15 – View latest measurement (webkit) | `Latest` text never appears |

### 13. TRACK comments — dialog never opens (all browsers)

Timeout waiting for comment UI (`Your comment` placeholder, `Reply`, `Submit` buttons):
- TRACK.16 – Add comment
- TRACK.17 – Reply to comment
- TRACK.F20 – Comment content empty
- TRACK.F21 – Comment content max

### 14. TRACK firefox-only failures (30s timeouts)

- TRACK.1 – Create workout (`toHaveAttribute` failed)
- TRACK.2 – Edit workout (24h)
- TRACK.4 – View workout history
- TRACK.5 – View workout calendar
- TRACK.12 – Edit measurement (24h)

---

## Errors logged during run (non-test issues, real bugs)

1. **i18n MISSING_MESSAGE** `workout.edit_dialog.remove_exercise` — `src/components/features/workout/EditWorkoutDialog.tsx:307` (missing in `messages/en.json`).
2. **i18n MISSING_MESSAGE** `athlete.trainers.detail.common.date.monday` (and likely all day names) — `src/app/[locale]/(dashboard)/athlete/trainers/[id]/page.tsx:439`.
3. **Hydration error**: `<button> cannot be a descendant of <button>` in `CreateReviewDialog` (DialogTrigger wraps a `<Button>`).
4. **Deprecation**: `revalidateTag` called without second `max`/`updateTag` argument (Next.js warning).

---

## Full failure list (by number → browser)

```
 1 chromium  AUTH.6 Logout
 2 chromium  REL.4 View my coaching requests
 3 chromium  REL.6 View my-trainer detail
 4 chromium  REL.7 Terminate relationship
 5 chromium  REL.11 Edit own review
 6 chromium  REL.12 Delete own review
 7 chromium  REL.F1 Coaching message optional
 8 chromium  REL.F6 Review comment max
 9 chromium  TRACK.3 Delete workout (24h)
10 chromium  TRACK.F8 Meal food required
11 chromium  TRACK.8 Delete meal (24h)
12 chromium  TRACK.F10 Meal calories negative
13 chromium  TRACK.F9 Meal quantity required
14 chromium  TRACK.F14 Meal time format
15 chromium  TRACK.11 Create body measurement
16 chromium  TRACK.14 View measurement charts
17 chromium  TRACK.13 Delete measurement (24h)
18 chromium  TRACK.F17 Measurement parts range
19 chromium  TRACK.16 Add comment
20 chromium  TRACK.17 Reply to comment
21 chromium  TRACK.F20 Comment content empty
22 chromium  TRACK.F21 Comment content max
23 firefox    AUTH.6 Logout
24 firefox    AUTH.10 Locale Switch
25 firefox    PLAN.1 Create own workout plan
26 firefox    PLAN.2 Edit own workout plan
27 firefox    REL.7 Terminate relationship
28 firefox    REL.11 Edit own review
29 firefox    REL.12 Delete own review
30 firefox    TRACK.1 Create workout
31 firefox    REL.F6 Review comment max
32 firefox    TRACK.3 Delete workout (24h)
33 firefox    TRACK.5 View workout calendar
34 firefox    TRACK.4 View workout history
35 firefox    TRACK.2 Edit workout (24h)
36 firefox    TRACK.8 Delete meal (24h)
37 firefox    TRACK.F9 Meal quantity required
38 firefox    TRACK.F8 Meal food required
39 firefox    TRACK.F10 Meal calories negative
40 firefox    TRACK.13 Delete measurement (24h)
41 firefox    TRACK.F14 Meal time format
42 firefox    TRACK.14 View measurement charts
43 firefox    TRACK.12 Edit measurement (24h)
44 firefox    TRACK.F17 Measurement parts range
45 firefox    TRACK.11 Create body measurement
46 firefox    TRACK.16 Add comment
47 firefox    TRACK.F20 Comment content empty
48 firefox    TRACK.F21 Comment content max
49 firefox    TRACK.17 Reply to comment
50 webkit     AUTH.6 Logout
51 webkit     AUTH.F1 Login identifier required
52 webkit     REL.11 Edit own review
53 webkit     REL.12 Delete own review
54 webkit     REL.F6 Review comment max
55 webkit     TRACK.3 Delete workout (24h)
56 webkit     TRACK.8 Delete meal (24h)
57 webkit     TRACK.F8 Meal food required
58 webkit     TRACK.F9 Meal quantity required
59 webkit     TRACK.F10 Meal calories negative
60 webkit     TRACK.F14 Meal time format
61 webkit     TRACK.11 Create body measurement
62 webkit     TRACK.15 View latest measurement
63 webkit     TRACK.14 View measurement charts
64 webkit     TRACK.13 Delete measurement (24h)
65 webkit     TRACK.F19 Measurement time format
66 webkit     TRACK.F17 Measurement parts range
67 webkit     TRACK.17 Reply to comment
68 webkit     TRACK.16 Add comment
69 webkit     TRACK.F20 Comment content empty
70 webkit     TRACK.F21 Comment content max
71 MobileChrome AUTH.6 Logout
```