# Phase 6: Polish & Optimization - Design Document

> Date: 2026-04-05
> Topic: Phase 6 Polish & Optimization
> Status: Validated

---

## Problem Statement

GymTrack is functionally complete across all 5 feature phases, but lacks production polish. The app uses basic "Loading..." text, has no error boundaries, inconsistent error handling, no optimistic updates, and untested mobile responsiveness. These gaps make the app feel unfinished despite solid core functionality.

**Key insight:** We're not adding features — we're making existing features feel polished, fast, and reliable.

---

## Constraints

- **No new features** - Polish and optimization only
- **Keep existing architecture** - No major refactors or rewrites
- **Incremental improvements** - Each change independently valuable
- **Maintain backward compatibility** - No breaking API changes
- **Preserve existing patterns** - Work within current codebase conventions

---

## Approach

Tackling Phase 6 in **4 focused batches** ordered by user-facing impact:

1. **User Experience** - Skeleton loaders, error boundaries, toast notifications
2. **Performance** - Query optimization, optimistic updates
3. **Error Handling** - Consistent error UI, form submission states
4. **Accessibility & Polish** - A11y audit, mobile responsiveness, visual polish

**Why this order:** UX improvements give the biggest perceived quality jump. Performance builds on that foundation. Error handling catches edge cases. Accessibility is the final polish pass.

---

## Architecture

### New Components

```
components/
├── ui/
│   └── skeleton.tsx              # ShadCN skeleton component
├── features/
│   └── common/
│       ├── WorkoutListSkeleton.tsx
│       ├── MealListSkeleton.tsx
│       ├── ClientListSkeleton.tsx
│       └── DashboardStatsSkeleton.tsx
├── layout/
│   ├── ErrorBoundary.tsx         # Class component error boundary
│   └── ToastProvider.tsx         # Global toast provider
```

### New Utilities

```
lib/
├── query-config.ts               # Centralized query defaults per domain
├── optimistic-helpers.ts         # Helpers for optimistic mutations
└── error-messages.ts             # User-friendly error message mapping
```

---

## Components

### Skeleton Loaders

**Purpose:** Replace "Loading..." text with content-shaped placeholders

- **WorkoutListSkeleton:** Card layout matching WorkoutList structure
- **MealListSkeleton:** Card layout matching MealList structure  
- **ClientListSkeleton:** Row layout matching client list
- **DashboardStatsSkeleton:** Number blocks matching stat cards

**Pattern:** Each skeleton mirrors its corresponding component's layout using ShadCN `<Skeleton>` with matching dimensions.

### Error Boundary

**Purpose:** Catch React rendering errors and show friendly fallback

- **Class component** implementing `componentDidCatch` and `getDerivedStateFromError`
- **Props:** `fallback` (custom UI), `onReset` (retry function)
- **Usage:** Wrap route segments and feature sections

### Toast Provider

**Purpose:** Global toast notification system

- **Integration:** ShadCN Sonner/Toast component
- **Usage:** Wrap app in root layout
- **API:** Simple `toast.success()`, `toast.error()`, `toast.info()` calls

### Query Config

**Purpose:** Centralized TanStack Query configuration

- **Per-domain staleTime:** Workouts (2min), Meals (2min), Comments (1min), Trainers (10min), Profile (5min)
- **Shared defaults:** retry: 1, gcTime: 10min
- **Prefetch helpers:** Dashboard data prefetch on layout mount

---

## Data Flow

### Optimistic Comment Flow (After)

```
User submits comment
       ↓
Toast: "Posting comment..."
       ↓
Optimistic update: Add comment to React Query cache immediately
       ↓
POST /api/comments (background)
       ↓
Success: Toast "Comment posted" → Cache confirmed
       ↓
Error: Rollback cache → Toast "Failed to post comment" → Retry option
```

### Query Prefetch Flow

```
Dashboard layout mounts
       ↓
Prefetch: user profile, relationships, notifications
       ↓
User navigates to workouts page
       ↓
Workout data already cached → instant render
       ↓
Background refetch if staleTime exceeded
```

---

## Error Handling

### Strategy

| Error Type | Handling |
|-----------|----------|
| **Query failure** | Inline error banner with retry button |
| **Mutation failure** | Toast notification + rollback (if optimistic) |
| **Form validation** | Inline Zod messages (already implemented) |
| **Auth failure** | Redirect to login (already handled) |
| **Network failure** | Toast + retry option |
| **Unexpected crash** | Error boundary with friendly message + reload |

### Error Message Mapping

Map backend errors to user-friendly text:
- `"token expired"` → "Your session has expired. Please log in again."
- `"not found"` → "This item could not be found."
- `"permission denied"` → "You don't have permission to perform this action."
- Network errors → "Connection failed. Please check your internet and try again."

---

## Testing Strategy

### Manual Testing Checklist

- [ ] All "Loading..." text replaced with skeletons
- [ ] Error boundaries catch simulated crashes
- [ ] Toast appears on every mutation (success and error)
- [ ] Comments appear instantly without waiting for server
- [ ] Forms disable submit button during submission
- [ ] Mobile layout works at 375px, 768px, 1024px
- [ ] Empty states show for all list views
- [ ] Keyboard navigation works for all interactive elements
- [ ] Dialogs trap focus and return focus on close

### Performance Verification

- Run Lighthouse before and after changes
- Target: Performance >80, Accessibility >90, Best Practices >90
- Verify React Query devtools shows efficient caching

### E2E Test Updates

- Update Playwright tests to handle skeleton states
- Add tests for optimistic comment posting
- Add tests for error boundary fallback UI

---

## Open Questions

1. **Infinite scroll vs Load More?** - Load More is simpler and more predictable. Recommend Load More button for workout/meal history.

2. **Toast library?** - ShadCN uses Sonner by default. Recommend Sonner for its clean API and good defaults.

3. **Real-time updates?** - Phase 4 marked WebSockets as optional. Skipping for Phase 6 — toast notifications + query refetch provides sufficient feedback.
