# React Doctor Report — 21 June 2026

**Score: 47 / 100 (Critical)**

Ran: `npx react-doctor@latest --verbose`  
Scanned: 238 files in 2.2s

---

## Summary

| Category        | Errors | Warnings |
|-----------------|--------|----------|
| Security        | 0      | 3        |
| Bugs            | 2      | 83       |
| Performance     | 0      | 39       |
| Accessibility   | 3      | 26       |
| Maintainability | 0      | 150      |
| **Total**       | **5**  | **301**  |

---

## Security (3 warnings)

### pnpm hardening missing (2)
`pnpm-workspace.yaml` is missing `minimumReleaseAge` and `trustPolicy` — risk of malware from newly published packages.

### Vulnerable React Server Components (1)
`next@16.2.4` bundles RSC runtime affected by CVE-2026-23870 (DoS). Upgrade to `next@16.2.6`.

---

## Bugs (2 errors, 83 warnings)

### Errors

| Rule | File | Line |
|------|------|------|
| State synced to a prop inside an effect | `src/components/features/meal/EditMealDialog.tsx` | 84 |
| State synced to a prop inside an effect | `src/components/features/workout/EditWorkoutDialog.tsx` | 102 |
| Invalid ARIA role `role="trainer"` | `src/components/features/workout-plan/ClientPlansTab.tsx` | 42 |
| Invalid ARIA role `role="athlete"` / `role="trainer"` | `src/components/features/workout-plan/MyWorkoutPlans.tsx` | 44 |
| Invalid ARIA role `role="trainer"` | `src/components/features/workout-plan/WorkoutPlanList.tsx` | 55 |

### Key Warnings

| Rule | Occurrences | Key Files |
|------|-------------|-----------|
| Missing effect dependencies | 2 | `athlete/trainers/[id]/page.tsx`, `PlanSetInput.tsx` |
| Array index as key | 14 | Meal components, workout components, chart.tsx, field.tsx, slider.tsx |
| Sequential independent awaits | 2 | `trainer/client/[username]/page.tsx`, `layout.tsx` |
| Derived state stored in effect | 3 | FilterBar components (body-measurement, meal, workout) |
| Prop mirrored into state via effect | 3 | FilterBar components |
| Mutation without cache invalidation | 1 | `BodyMeasurementForm.tsx` |
| Component rendered by inline function call | 5 | Trainer profile, review components |
| Client-side redirect for navigation | 9 | Multiple dashboard/layout pages |
| useSearchParams without Suspense | 2 | `athlete/workouts/page.tsx`, `page.tsx` |
| Prop derived into useState | 5 | FilterBar, CommentItem, ReviewActions |
| preventDefault on form/link | 7 | Login, profile, dialogs, forms |
| Derived value copied into state | 8 | FilterBars, Edit dialogs |
| All state reset on prop change | 3 | FilterBar components |
| Event logic handled in effect | 5 | Measurements page, dialogs, calendar |
| Button missing explicit type | 5 | Requests page, profile, sidebar |
| Data passed to parent via effect | 5 | carousel.tsx, EditMealDialog |
| Many related useState calls | 7 | Multiple components |

---

## Performance (39 warnings)

| Rule | Occurrences | Key Files |
|------|-------------|-----------|
| Heavy library loaded eagerly (recharts) | 6 | Chart components |
| Full Framer Motion import | 15 | Dashboard, landing, components |
| Unstable context provider value | 3 | carousel.tsx, chart.tsx, toggle-group.tsx |
| Non-static dynamic import path | 1 | `i18n/request.ts` |
| State initializer runs on every render | 4 | Calendar components |
| Listener re-subscribes on every handler change | 1 | carousel.tsx |
| useMemo before early return | 2 | chart.tsx, field.tsx |
| URL hook value only read in handlers | 2 | workouts/page.tsx, locale-toggle.tsx |
| .map().filter(Boolean) loops twice | 1 | TrainerProfileView.tsx |
| Chained array iterations | 3 | chart.tsx, form-field.tsx |
| Spread copy before sort() | 1 | BodyMeasurementCharts.tsx |
| Pure function rebuilt every render | 11 | Multiple components |
| Static value rebuilt every render | 2 | EquipmentBadge, MuscleGroupBadge |

---

## Accessibility (3 errors, 26 warnings)

### Errors (Invalid ARIA roles)
Listed under Bugs errors above.

### Key Warnings

| Rule | Occurrences | Key Files |
|------|-------------|-----------|
| Label missing associated control | 1 | `ui/label.tsx` |
| Control missing accessible label | 7 | Register, profile, client tabs |
| Interaction on static element | 1 | TerminateRelationshipDialog |
| Role used instead of HTML tag | 9 | breadcrumb, carousel, field, input-group |
| Click handler missing keyboard handler | 4 | Register page, dialogs |
| Anchor has no content | 1 | pagination.tsx |
| Handler on non-interactive element | 2 | Register page |
| Redundant ARIA role | 1 | pagination.tsx |

---

## Maintainability (150 warnings)

| Rule | Occurrences | Notes |
|------|-------------|-------|
| Unused files | 34 | Various UI components, hooks, validations |
| Circular dependencies | 14 | `src/lib/api/` modules cycle through `index.ts` |
| Unused exports | 46 | `animations.ts`, `constants.ts`, validations |
| Unused dependencies | 7 | Various `@radix-ui/*` packages, `radix-ui` |
| Large components | 6 | RegisterPage (418 lines), Profile page, forms, dialogs |
| Multiple components in one file | 14 | DashboardShell, UI components |
| Non-component export in component file | 6 | badge.tsx, button-group.tsx, etc. |
| React 19 API migration | 5 | forwardRef → direct ref prop, useContext → use() |

---

*Generated by `npx react-doctor@latest --verbose`*
