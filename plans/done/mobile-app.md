# GymTrack Mobile App — Web-to-Native Migration

## Context

**Existing codebase**: Next.js 16 web app (`frontend/`) + Go/Gin backend (`backend/`). The web app is desktop-first with partial mobile responsiveness. Backend exposes a REST API at `http://localhost:8080/api` with JWT Bearer auth. The frontend has 39 shadcn primitives (React DOM only), 14 feature modules, full i18n coverage (en/tr), and 24 page routes.

**Goal**: Build a React Native + Expo mobile app using the **strangler fig migration pattern** — stand up a native shell, run the web UI inside it on day one via DOM components, then progressively nativize screens by value. Reuses the existing Go backend unchanged.

**Types**: Both web and mobile generate TypeScript types from the backend's OpenAPI spec (`backend/docs/swagger.json`) via `openapi-typescript`. The backend (Go structs) is the single source of truth — no manual type duplication.

---

## Migration Strategy

This follows Expo's [From Web to Native with React](https://expo.dev/blog/from-web-to-native-with-react) — migrate, don't rewrite.

```
Step 1: Assess     → Write the screen worklist (this document)
Step 2: Scaffold   → create-expo-app, mirror routes in expo-router
Step 3: DOM Shell  → Every screen runs in a webview ('use dom') — SHIP DAY ONE
Step 4: Strangle   → Nativize screens one-by-one, highest value first
Step 5: Wire Data  → Auth, API client, caching (can overlap with step 4)
Step 6: Ship       → EAS Build → App Store / Play Store
```

**Principles:**
- **Ship on day one.** The DOM-component shell is shippable to TestFlight before anything is nativized.
- **Strangle by value.** Nativize the hot screens (login, dashboard, workout list); leave low-traffic screens in the webview.
- **Nativize means redesign, not reskin.** Use `@expo/ui` first (real SwiftUI/Compose), then platform navigation (NativeTabs, large titles), then mobile UX (swipe, haptics). If it still looks like a website, you ported instead of redesigned.
- **Verify by running, not compiling.** A clean `expo export` proves bundling, not rendering.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   Expo App (React Native)               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │   Auth   │  │ Workout  │  │  Meal    │  │ Profile  │ │
│  │  Screen  │  │  Screen  │  │  Screen  │  │  Screen  │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │
│  ┌──────────────────────────────────────────────────────┐│
│  │     Shared API Client / Auth Store / i18n Layer       ││
│  └──────────────────────────────────────────────────────┘│
└────────────────────────┬────────────────────────────────┘
                         │ REST + JWT Bearer
┌────────────────────────▼────────────────────────────────┐
│           Go/Gin Backend (existing, port 8080)           │
│  auth | workouts | meals | measurements | exercises |   │
│  workout-plans | coaching | relationships | reviews |   │
│  trainer-catalog | availability | admin | metrics       │
└─────────────────────────────────────────────────────────┘
```


---

## Step 1 — Screen Assessment (Worklist)

### 1.1 Web Routes Inventory

24 page routes in `frontend/src/app/[locale]/`:

| Route | Feature Module | Bucket | Priority | Notes |
|---|---|---|---|---|
| `(auth)/login` | auth | **nativize-now** | P0 | Daily entry point, needs native form + keyboard |
| `(auth)/register` | auth | **nativize-now** | P0 | Role selector, native form |
| `(dashboard)/dashboard` | dashboard | **nativize-now** | P0 | Hot screen, cards + calendar + quick actions |
| `(dashboard)/athlete/workouts` | workout | **nativize-now** | P0 | Core value, FlatList + date filters + form |
| `(dashboard)/athlete/meals` | meal | **nativize-now** | P1 | Core value, FlatList + nutrition summary |
| `(dashboard)/athlete/measurements` | body-measurement | **nativize-later** | P2 | Charts need rewrite (recharts → Skia/victory-native-xl) |
| `(dashboard)/athlete/trainers` | trainer | **nativize-later** | P2 | Trainer catalog browse, less frequent |
| `(dashboard)/athlete/trainers/[id]` | trainer | **nativize-later** | P2 | Trainer detail + availability |
| `(dashboard)/athlete/my-trainer/[id]` | trainer | **nativize-later** | P2 | Assigned trainer detail |
| `(dashboard)/athlete/requests` | coaching | **nativize-later** | P2 | Coaching request list |
| `(dashboard)/athlete/workout-plans` | workout-plan | **nativize-later** | P2 | Assigned plan list |
| `(dashboard)/trainer/clients` | trainer | **nativize-later** | P3 | Client card list |
| `(dashboard)/trainer/client/[username]` | trainer | **hybrid** | P3 | Complex detail with tabs (Overview, Workouts, Meals, Progress) |
| `(dashboard)/trainer/profile` | trainer | **nativize-later** | P3 | Trainer profile edit |
| `(dashboard)/trainer/requests` | coaching | **nativize-later** | P3 | Incoming coaching requests |
| `(dashboard)/trainer/workout-plans` | workout-plan | **nativize-later** | P3 | Plan list + creation |
| `(dashboard)/trainer/workout-plans/[id]` | workout-plan | **hybrid** | P3 | Plan detail + exercise editor |
| `(dashboard)/profile` | common | **nativize-later** | P2 | User profile settings |
| `(dashboard)/admin` | admin | **skip** | — | Desktop-only admin dashboard |
| `(dashboard)/admin/profile` | admin | **skip** | — | Admin profile |
| `(dashboard)/admin/users` | admin | **skip** | — | Admin user management |
| `(dashboard)/admin/users/[id]` | admin | **skip** | — | Admin user detail |
| `page.tsx` (root) | landing | **skip** | — | Landing page, not needed for mobile |

**Server route** (stays server-side, not migrated):
- `api/auth/session/route.ts` — Next.js-only session cookie handler. Mobile does NOT use this; it talks directly to the Go backend.

### 1.2 Framework Signals

| Signal | Impact on Migration |
|---|---|
| **RSC / `server-only`** | `dal.ts` uses `cookies()`, `cache()`, `unstable_cache()` — all server-only. Must be split into client fetch + presentational component before porting. |
| **`next/link`** | → Replace with `expo-router` `Link` component |
| **`next/navigation`** | → Replace with `expo-router` hooks (`useRouter`, `useLocalSearchParams`) |
| **`next-intl`** | i18n routing wrappers (`src/i18n/routing.ts`, `navigation.ts`) are Next.js-specific. Mobile needs `expo-localization` + direct message JSON loading. |
| **Tailwind CSS v4** | Not available in React Native. Styling must be redone (NativeWind or StyleSheet). |
| **shadcn/ui (39 components)** | React DOM only. Replace with `@expo/ui` (primary) + RN primitives (fallback). |
| **recharts (5 charts)** | SVG-based, React DOM only. Replace with `victory-native-xl` (Skia-based) or `react-native-chart-kit`. |
| **motion (framer-motion)** | React DOM only. Replace with `react-native-reanimated`. |
| **sonner (toast)** | React DOM only. Replace with `burnt` (native toast) or `expo-haptics` + custom. |
| **vaul (drawer)** | React DOM only. Replace with `@expo/ui` bottom sheet or `@gorhom/bottom-sheet`. |

### 1.3 Third-Party Services & SDKs

| Web Service | Mobile Status | Action |
|---|---|---|
| Sentry (`@sentry/nextjs`) | Needs `@sentry/react-native` | Swap SDK at step 5 |
| No payment integration | N/A | No IAP fork needed |
| No push notifications | Add `expo-notifications` at step 5 | New capability |

---

## Step 2 — Scaffold Expo Shell

### 2.1 Initialize Expo Project

```bash
cd gymtrack
npx create-expo-app@latest mobile --template tabs
cd mobile
```

**Key packages to install:**

| Package | Purpose |
|---|---|
| `expo-router` | File-based navigation (maps from Next.js App Router) |
| `expo-secure-store` | Secure JWT token storage (replaces in-memory TokenService + session cookie) |
| `expo-localization` | Device locale detection for i18n |
| `@expo/ui` | Native SwiftUI/Compose components (primary, for step 4 nativization) |
| `@tanstack/react-query` | Server state (same library as web) |
| `zustand` | Client state (same library as web) |
| `zod` | Validation (same library as web) |
| `react-native-reanimated` | Animations (replaces motion/framer-motion) |
| `@gorhom/bottom-sheet` | Bottom sheets (replaces vaul drawer) |
| `victory-native-xl` | Charts with Skia (replaces recharts) |

### 2.2 Project Structure

```
mobile/
├── app/                          # expo-router file-based routing
│   ├── _layout.tsx               # Root layout (Stack)
│   ├── (auth)/                   # Auth group (no tab bar)
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (tabs)/                   # Tab navigator
│   │   ├── _layout.tsx           # Tab bar definition
│   │   ├── index.tsx             # Dashboard / Home
│   │   ├── workouts.tsx          # Athlete workouts
│   │   ├── meals.tsx             # Athlete meals
│   │   ├── measurements.tsx      # Body measurements
│   │   └── profile.tsx           # Profile
│   ├── trainer/                  # Trainer-specific routes
│   │   ├── clients.tsx
│   │   ├── client/[username].tsx
│   │   ├── plans.tsx
│   │   ├── plans/[id].tsx
│   │   ├── requests.tsx
│   │   └── profile.tsx
│   └── trainer-catalog/          # Athlete → find trainers
│       ├── index.tsx
│       └── [id].tsx
├── src/
│   ├── api/                      # API client + domain modules (adapted from web)
│   │   ├── client.ts             # Adapted api-client (expo-secure-store for tokens)
│   │   ├── authApi.ts            # Copied from web
│   │   ├── workoutApi.ts         # Copied from web
│   │   ├── mealApi.ts            # Copied from web
│   │   └── ...                   # All 17 domain API modules
│   ├── components/
│   │   └── features/             # Domain components (ported from web)
│   ├── stores/
│   │   └── authStore.ts          # Zustand auth (adapted for secure-store)
│   ├── lib/
│   │   ├── auth.ts               # Token storage via expo-secure-store
│   │   ├── i18n.ts               # i18n setup with expo-localization
│   │   └── query-client.ts       # TanStack Query config
│   ├── hooks/                    # Custom hooks (port from web)
│   ├── types/
│   │   ├── generated.ts          # Generated from backend OpenAPI spec via openapi-typescript
│   │   └── index.ts              # Re-exports from generated.ts + mobile-specific UI types
├── messages/                     # i18n JSON (en, tr) — copied from web
│   ├── en.json
│   └── tr.json
└── assets/                       # Images, fonts
```

### 2.3 Route Mapping (Next.js → Expo Router)

Next.js uses `[locale]` prefix and `(route-group)/` patterns. Expo Router mapping:

| Next.js Route | Expo Router Route | Notes |
|---|---|---|
| `[locale]/(auth)/login/page.tsx` | `(auth)/login.tsx` | No locale prefix needed |
| `[locale]/(dashboard)/athlete/workouts/page.tsx` | `(tabs)/workouts.tsx` | Flattened into tab group |
| `[locale]/(dashboard)/athlete/trainers/[id]/page.tsx` | `trainer-catalog/[id].tsx` | Dynamic segment same syntax |
| `[locale]/(dashboard)/trainer/client/[username]/page.tsx` | `trainer/client/[username].tsx` | Same dynamic segment |
| `[locale]/(dashboard)/trainer/workout-plans/[id]/page.tsx` | `trainer/plans/[id].tsx` | Same dynamic segment |

---

## Step 3 — DOM Component Shell (Day-One Milestone)

Bring every screen over as a DOM component (`'use dom'`) rendered by its native route, so the whole app runs on a phone before anything is nativized. This is shippable to TestFlight as-is.

### 3.1 DOM Component Pattern

Each expo-router screen wraps the web component in a DOM component:

```typescript
// app/(tabs)/workouts.tsx
import WorkoutDom from '@/components/dom/WorkoutDom'
export default function WorkoutsScreen() {
  return <WorkoutDom />
}

// src/components/dom/WorkoutDom.tsx
'use dom'
// Port the web workout page here, replacing:
// - next/link → <a> tags (DOM components render in a webview)
// - next/navigation → standard DOM event handling
// - Server Component data fetching → client-side fetch with TanStack Query
```

### 3.2 Required Edits Per Screen

Each web screen needs these edits when porting to DOM:

1. **Unwrap Server Components** — `dal.ts` functions (`getSession`, `verifySession`, `serverFetch`) use `server-only` APIs. Replace with client-side `useQuery` calls to the Go backend.
2. **Swap framework imports** — `next/link` → `<a>`, `next/navigation` → DOM equivalents, `next-intl` wrappers → direct `useTranslations` from a portable i18n setup.
3. **Carry styling** — Tailwind classes work inside `'use dom'` components (they run in a webview). Import the web's `globals.css`.
4. **Remove Next.js middleware** — `proxy.ts` auth guard doesn't apply; the expo-router `_layout.tsx` handles auth gating.

### 3.3 Auth Guard (Expo Router)

```typescript
// app/_layout.tsx
import { useAuthStore } from '@/stores/authStore'
import { Redirect, Stack } from 'expo-router'

export default function RootLayout() {
  const { isAuthenticated, isInitialized } = useAuthStore()

  if (!isInitialized) return <SplashScreen />
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />

  return <Stack />
}
```

---

## Step 4 — Strangle Screens to Native

Walk the worklist (step 1) top-down by priority. For each screen:

1. **Redesign** it native — don't port the web layout
2. Use **`@expo/ui` first** (real SwiftUI/Compose: buttons, lists, sheets, pickers, sliders)
3. Add **platform navigation** (NativeTabs, large titles via expo-router)
4. Add **mobile UX** (swipe, haptics via `expo-haptics`, momentum scroll)
5. Use RN primitives only for custom layouts
6. Verify **content and behavior** against the running web original

### 4.1 Component Replacement Map (shadcn → native)

| shadcn/ui (Web) | Native Replacement | Notes |
|---|---|---|
| `Button` | `@expo/ui` Button | Real SwiftUI/Compose button |
| `Input` | `@expo/ui` TextField | Native text input |
| `Card` | `@expo/ui` GroupBox / custom View | Layout container |
| `Dialog` | `@expo/ui` AlertDialog / `@gorhom/bottom-sheet` | Sheets feel more native than dialogs |
| `Sheet` (vaul) | `@gorhom/bottom-sheet` | Native bottom sheet |
| `Select` | `@expo/ui` Picker | Native picker |
| `Tabs` | `expo-router` TabLayout | Platform tab bar |
| `Table` | `@expo/ui` Table / FlashList | Native table or list |
| `Badge` | `@expo/ui` Label + styling | Simple styled component |
| `Avatar` | `@expo/ui` Image | Native image with fallback |
| `Calendar` | `react-native-calendars` | Lightweight calendar |
| `Chart` (recharts) | `victory-native-xl` | Skia-based charts |
| `Sidebar` | `expo-router` TabLayout | Tabs replace sidebar nav on mobile |
| `Dropdown Menu` | `@expo/ui` Menu | Native context menu |
| `Command` (cmdk) | `@expo/ui` SearchField + List | Native search |
| `Scroll Area` | `ScrollView` / `FlashList` | Native scroll |
| `Drawer` | `@gorhom/bottom-sheet` | Native bottom sheet |
| `Toast` (sonner) | `burnt` + `expo-haptics` | Native toast + haptics |
| `Skeleton` | `expo-linear-gradient` shimmer | Native loading state |

### 4.2 Nativization Order

| Pass | Screen | Priority | Effort | Why Now |
|---|---|---|---|---|
| 1 | Login + Register | P0 | Medium | Entry point, native keyboard + form |
| 2 | Dashboard | P0 | High | First screen users see, cards + calendar |
| 3 | Workout List + Log | P0 | High | Core value, FlatList + exercise set inputs |
| 4 | Meal List + Log | P1 | Medium | Core value, food item input with macros |
| 5 | Measurements | P2 | Medium | Charts rewrite (victory-native-xl) |
| 6 | Profile | P2 | Low | Settings form |
| 7 | Trainer Catalog | P2 | Medium | Browse + detail + request |
| 8 | Trainer Screens | P3 | High | Client list + plans + requests |

### 4.3 Navigation Structure

```typescript
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router'
import { NativeTabs } from 'expo-router/ui'

export default function TabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Screen name="index" title="Home" icon="house" />
      <NativeTabs.Screen name="workouts" title="Workouts" icon="dumbbell" />
      <NativeTabs.Screen name="meals" title="Meals" icon="fork.knife" />
      <NativeTabs.Screen name="measurements" title="Measurements" icon="ruler" />
      <NativeTabs.Screen name="profile" title="Profile" icon="person" />
    </NativeTabs>
  )
}
```

---

## Step 5 — Wire Data, Auth, and Storage

### 5.1 Auth Flow (Mobile-Specific)

The web uses a Next.js session cookie layer that **does not exist** on mobile. Mobile talks directly to the Go backend.

```
┌──────────┐     POST /api/auth/login      ┌──────────────┐
│  Mobile  │ ──────────────────────────────→ │ Go Backend   │
│  App     │ ←── { accessToken, refreshToken,│ (port 8080)  │
│          │      user }                     │              │
│          │                                 │              │
│  Stores  │ ──── expo-secure-store ────→    │              │
│  tokens  │                                 │              │
│          │     POST /api/auth/refresh      │              │
│          │ ──────────────────────────────→ │              │
│          │ ←── { accessToken }             │              │
│          │                                 │              │
│          │     GET /api/users/me           │              │
│          │ ──────────────────────────────→ │              │
│          │ ←── { user }                    │              │
└──────────┘                                 └──────────────┘
```

**Flow:**

1. **Login** → `POST /api/auth/login` → `{ accessToken, refreshToken, user }` → store in `expo-secure-store`
2. **Session restore** → on app open, read tokens from secure store → `GET /api/users/me` to validate token + get user
3. **Token attach** → `api-client.ts` reads from secure store → `Authorization: Bearer <token>`
4. **Token refresh** → `POST /api/auth/refresh` with `{ refreshToken }` → new `{ accessToken }` → update secure store
5. **Logout** → clear secure store + `POST /api/auth/logout` (best-effort, Go backend currently returns 200 without token blacklisting)

**Key difference from web**: The web's `GET /api/auth/session` is a **Next.js route handler** that decrypts an HttpOnly cookie. This endpoint does NOT exist on the Go backend. Mobile uses `GET /api/users/me` (Go backend, requires Bearer token) for session validation instead.

### 5.2 API Client Adaptation

```typescript
// src/api/client.ts
import * as SecureStore from 'expo-secure-store'

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080/api'

async function getAuthHeader(): Promise<string | null> {
  const token = await SecureStore.getItemAsync('accessToken')
  return token ? `Bearer ${token}` : null
}

// Adapted from frontend/src/lib/api/api-client.ts:
// - tokenService (in-memory singleton) → SecureStore (persistent, async)
// - process.env.NEXT_PUBLIC_API_URL → process.env.EXPO_PUBLIC_API_URL
// - fetch() works the same in React Native
// - AbortController/timeout works the same
```

**Copyable from web** (with adaptation):
- `frontend/src/lib/api/*.ts` → `src/api/` (17 domain API modules)
- `frontend/src/lib/api/api-types.ts` → `src/api/api-types.ts`
- `frontend/src/lib/validations/*.ts` → `src/lib/validations/` (Zod schemas)
- `frontend/messages/{en,tr}.json` → `messages/` (i18n translations)

**TypeScript types — NOT copied from web, generated from backend OpenAPI spec:**
Types are generated from the same `backend/docs/swagger.json` that the frontend uses, via `openapi-typescript`. This ensures the mobile app stays in sync with the true backend contract, not a manually maintained copy.

```bash
# Generate types from backend OpenAPI spec
cd mobile
pnpm add -D openapi-typescript
pnpm openapi-typescript ../backend/docs/swagger.json -o ./src/types/generated.ts
```

Add to `mobile/package.json`:
```json
"codegen:types": "openapi-typescript ../backend/docs/swagger.json -o ./src/types/generated.ts"
```

Then `src/types/index.ts` re-exports from `generated.ts` and adds mobile-specific UI types (same pattern as the web frontend):

```typescript
// src/types/index.ts
// Re-export generated API types
export {
  Workout, Meal, User, Exercise, UserProfile, UserRole,
  // ... all needed types
} from './generated';

// Mobile-specific UI types (not in API)
export type ToastPosition = "top" | "bottom";
// etc.
```

**Not copyable** (web-specific, must be replaced):
- `frontend/src/lib/token-service.ts` → replaced by `expo-secure-store` wrapper
- `frontend/src/lib/session.ts` → Next.js `server-only` encryption, not needed
- `frontend/src/lib/dal.ts` → server-only data access layer, not needed
- `frontend/src/proxy.ts` → Next.js middleware, replaced by expo-router layout auth guard
- `frontend/src/i18n/routing.ts` → next-intl specific, replaced by portable i18n setup
- `frontend/src/types/index.ts` → DO NOT COPY; types are generated from OpenAPI spec instead

### 5.3 i18n Setup

Use existing `messages/en.json` and `messages/tr.json` directly. Device locale detection via `expo-localization`:

```typescript
// src/lib/i18n.ts
import { getLocales } from 'expo-localization'
import en from '../../messages/en.json'
import tr from '../../messages/tr.json'

const messages = { en, tr }
const deviceLocale = getLocales()[0]?.languageCode ?? 'en'
```

### 5.4 Query Client

Mirror the web config:
- `staleTime`: 5 min
- `gcTime`: 10 min
- `retry`: 1
- On auth error (401): attempt token refresh via `POST /api/auth/refresh` → retry → if refresh fails, clear secure store + redirect to login

### 5.5 Backend CORS Fix

The backend currently hardcodes these origins in `backend/internal/app/module.go`:

```go
corsConfig.AllowOrigins = []string{
    "http://localhost:3000", "http://[IP_ADDRESS]:3000",
    "http://localhost:3001", "http://[IP_ADDRESS]:3001",
}
```

**Problem**: Mobile devices (physical phones, emulators) send requests from different origins. The `[IP_ADDRESS]` placeholders are never substituted at runtime — they're dead config.

**Fix**: Either add the device/emulator IP to `AllowOrigins`, or switch to `AllowAllOrigins = true` for development. For production, configure a proper allowlist or use a reverse proxy.

```go
// Development: allow all origins
corsConfig.AllowAllOrigins = true

// Production: add specific origins
corsConfig.AllowOrigins = append(corsConfig.AllowOrigins,
    "exp://192.168.1.x:8081",  // Expo Go
    // ... production URLs
)
```

---

## Step 6 — Build & Deploy

```bash
# Development
npx expo start                    # Expo Go (DOM components + nativized screens)
npx expo run:android              # Android emulator
npx expo run:ios                  # iOS simulator

# Production
eas build --platform all          # EAS Build for App Store + Play Store
eas submit                        # Submit to stores
eas update                        # OTA updates after initial release
```

**Note**: `@expo/ui` and DOM components both run in **Expo Go** (SDK 56+). A dev build (`expo-dev-client`) is only needed for custom native modules (e.g., `@gorhom/bottom-sheet`, `victory-native-xl` with Skia).

---

## Testing Strategy

| Layer | Tool | Notes |
|---|---|---|
| Unit | Jest + React Native Testing Library | Mirror web test patterns |
| API Mocking | MSW (React Native compatible) | Reuse `handlers.ts` patterns from web |
| E2E | Maestro | Modern mobile E2E, simpler than Detox |
| Visual Parity | `agent-browser` (web) + `argent` (native) | Compare running apps, not builds |
| Manual QA | Expo Go + Dev Client | — |

---

## Critical Risks & Mitigations

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| 1 | **CORS** — Backend allows only `localhost:3000/3001` with dead `[IP_ADDRESS]` placeholders | Mobile requests blocked | Update `module.go` CORS config to `AllowAllOrigins` for dev; proper allowlist for prod |
| 2 | **Auth session mismatch** — Web uses Next.js cookie layer (`/api/auth/session`), not available on mobile | Auth flow must be rewritten | Mobile talks directly to Go backend; session restore via `GET /api/users/me`, refresh via `POST /api/auth/refresh` (already exists in Go) |
| 3 | **Server Components** — `dal.ts` uses `server-only`, `cookies()`, `cache()`, `unstable_cache()` | Can't port to DOM directly | Split into client fetch + presentational component before porting each screen |
| 4 | **shadcn → native** — 39 web components need mobile equivalents | Significant component rewrite | Use `@expo/ui` (primary) + RN primitives (fallback); factor shared logic into hooks |
| 5 | **Charts** — 5 recharts components (SVG, React DOM only) | Charts must be rewritten | `victory-native-xl` (Skia-based) — same data, different renderer |
| 6 | **Types from codegen** — Types are generated from `backend/docs/swagger.json` via `openapi-typescript` | Generated types must be committed and CI must regenerate them | Run `pnpm codegen:types` after backend model changes; commit `generated.ts`; CI reruns generation on PRs with backend changes |
| 7 | **DOM component weight** — Each DOM screen carries ~2 MB web runtime | App size bloat if too many DOM screens | Nativize hot screens (step 4); leave only low-traffic screens as DOM |
| 8 | **`[IP_ADDRESS]` CORS placeholders** — Never substituted at runtime | Dead config | Remove or replace with actual IPs/origins |

---

## Recommended Execution Order

| Phase | What | Deliverable | Est. Effort |
|---|---|---|---|
| **0** | Fix backend CORS for mobile origins | Mobile can reach the API | 0.5 hr |
| **1** | Bootstrap Expo project + project structure | Empty shell with routes | 2 hr |
| **—** | Set up types codegen from backend OpenAPI spec | `src/types/generated.ts` via `pnpm codegen:types` | 1 hr |
| **2** | Auth infrastructure (secure-store, API client, auth store) | Login/register working natively | 4 hr |
| **3** | DOM component shell (all remaining screens) | Full app running in webviews | 1–2 days |
| **4** | Nativize Login + Register | Native forms + keyboard | 4 hr |
| **5** | Nativize Dashboard | Native cards + calendar + quick actions | 1 day |
| **6** | Nativize Workouts (list + log) | FlatList + exercise set inputs | 1–2 days |
| **7** | Nativize Meals (list + log) | FlatList + food item input | 1 day |
| **8** | Nativize Measurements + Profile | Charts + settings | 1 day |
| **9** | Nativize Trainer screens | Catalog + client list + plans | 2–3 days |
| **10** | Polish + E2E tests + ship | Store-ready builds | 2–3 days |

**Total estimate**: 2–3 weeks for full nativization, shippable after phase 3 (day-one DOM shell).
