# Mobile Login — "First Attempt Fails, Retry Succeeds" Fix Plan

**Status:** Plan only. NOT implemented. Awaiting go-ahead.
**Project:** `mobile/` (`gymtrack-mobile`, Expo 57 / React Native 0.86 / zustand 5.0.14)
**Symptom:** On the Expo mobile app, the FIRST login attempt does not log the user in; a later attempt succeeds.
**Reported environment:** cold start (app killed/reopened), `expo start` + Android emulator in Expo Go.

---

## Investigation summary

Launched focused context-gathering subagents (no planning/implementation yet):

- **scout (mobile internals)** — read `src/stores/authStore.ts`, `src/lib/auth.ts`, `src/api/client.ts`, `app/_layout.tsx`, `LoginScreen.tsx`. Confirmed the auth wiring and surfaced the conditional-navigator swap as the prime suspect.
- **scout (backend + web contract)** — confirmed the Go backend is 100% Bearer-token / JSON-body, **never sets cookies**, and that mobile's token handling matches the working web app. Ruled out cookie/CORS causes.
- **researcher (ecosystem)** — could NOT run (live web tools unavailable in this environment). Hypothesis validation below is based on the two scouts plus direct code reading; a live-web confirmation pass is still desirable but not blocking.

---

## Root cause (high confidence)

**Conditional two-`<Stack>` navigator swap in `app/_layout.tsx` → `AppNavigator` (lines 57–89).**

```tsx
if (!isAuthenticated) return <Stack><Stack.Screen name="(auth)" /></Stack>;
return <Stack><Stack.Screen name="(tabs)" /> <Stack.Screen name="trainer" /> ...</Stack>;
```

This returns **two entirely different `<Stack>` elements** keyed off `isAuthenticated`. On the *first* `isAuthenticated` toggle (cold-start login in Expo Go), expo-router rebuilds the navigator's route state from the new screen set and frequently fails to push the `(tabs)` route on that initial transition — the app appears **stuck on the login screen with no error**. On a retry, the navigator is already mounted and the same state change resolves cleanly. This is the canonical expo-router "swap the root navigator" anti-pattern and matches the symptom exactly.

Supporting evidence:
- `authStore.login` (`src/stores/authStore.ts:44-51`) **awaits** `setTokens()` before `set({ isAuthenticated: true })`, so the token is already in `expo-secure-store` when `(tabs)` mounts — there is no 401/token-timing bounce.
- `client.ts:36` reads the token from `expo-secure-store` on every request; `getMe()`/dashboard queries therefore succeed on first login.
- The group layouts `app/(auth)/_layout.tsx` and `app/(tabs)/_layout.tsx` contain **no auth guards at all** — all gating lives in the fragile swap.
- `EXPO_PUBLIC_API_URL=http://10.0.2.2:8080/api` (`.env`) is correctly set for the Android emulator → network is reachable (which is why the retry works).

---

## Hypotheses ruled out

| Hypothesis | Why ruled out |
|---|---|
| Cookie / CORS / Secure-flag first round-trip | Go backend never sets cookies; token is in JSON body (`auth_handler.go:~L142-159`). Mobile reads body via secure-store exactly like the working web app. |
| 401 bounce → `onSessionExpired` resets `isAuthenticated` | `login` awaits `setTokens` before flipping the flag, so the token is present for dashboard queries. No bounce occurs. |
| zustand no-selector subscription freeze | zustand 5.0.14 subscribes correctly to whole-state reads; `AppNavigator` does re-render on `set`. Not the freeze cause. |
| `EXPO_PUBLIC_API_URL` / network topology | Set to `10.0.2.2` (correct for Android emulator). A wrong value would fail *every* attempt, not just the first. |
| Stale zustand-persist hydration (`_hasHydrated`) | No `persist` middleware anywhere in `mobile/src`; the store is in-memory only. Irrelevant. |

---

## Proposed fix — Option A (recommended): canonical single-Stack + `<Redirect>` guards

Keep **one stable `<Stack>`** in the root and move gating into the group layouts. This eliminates the navigator-remount race entirely and is immune to all ruled-out hypotheses.

### 1. `app/_layout.tsx` — `AppNavigator`
- Render a **single static** `<Stack>` with all group screens always present (no conditional `<Stack>` swap).
- Gate only on `isInitialized` (show `<LoadingScreen>` until auth is restored).
- Replace the no-selector `useAuthStore()` read with explicit selectors.

```tsx
function AppNavigator() {
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const initializeAuth = useAuthStore((s) => s.initializeAuth);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  if (!isInitialized) return <LoadingScreen />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="trainer" />
      <Stack.Screen name="athlete" />
      <Stack.Screen name="trainer-catalog" />
    </Stack>
  );
}
```

> Align `unstable_settings.initialRouteName` with the new first screen: change `"<span>(tabs)</span>"` → `"<span>(auth)</span>"` (or remove it) so a cold, logged-out start lands on `(auth)` directly instead of detouring through a `(tabs)` redirect.

### 2. `app/(auth)/_layout.tsx` — add authenticated guard
```tsx
import { Redirect } from "expo-router";
import { useAuthStore } from "@/stores/authStore";

export default function AuthLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (isAuthenticated) return <Redirect href="/(tabs)" />;
  return (
    <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  );
}
```

### 3. `app/(tabs)/_layout.tsx` — add logged-out guard
```tsx
import { Redirect } from "expo-router";
import { useAuthStore } from "@/stores/authStore";
// ...existing imports/colors...

export default function TabLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  // ...existing <Tabs>...
}
```

`LoginScreen.tsx` needs **no change** — after a successful `login()` flips `isAuthenticated`, the `(auth)` layout's `<Redirect>` navigates to `/(tabs)`, exactly as today's implicit navigation did.

---

## Open decisions (resolve before implementing)

1. **Fix scope — Option A (above) vs Option B (minimal patch).**
   - **Option A (recommended):** static single `<Stack>` + `<Redirect>` guards. Robust; directly removes the remount race.
   - **Option B (minimal):** keep the current structure, just add an explicit `router.replace("/(tabs)")` after `login()` in `LoginScreen`. Risk: may still fight the navigator swap and not fully fix the first-attempt failure.
   - **Recommendation:** A. Option B is a weaker bet.
2. **Harden the other authenticated groups?** `trainer/`, `athlete/`, `trainer-catalog/` have their own `_layout.tsx` and are currently reachable only via in-app links. Add the same `!isAuthenticated → <Redirect href="/(auth)/login" />` guard to them too (defense against deep-links while logged out), or leave them for now and keep the change minimal. **Default in this plan:** include the guards (cheap, correct) — flip to "minimal" if you prefer a smaller diff.

---

## Verification (manual — requires the Android emulator)

I cannot run the emulator in this environment, so the fix is the standard pattern that removes the suspected cause; confirm on-device:

1. Kill the app (cold start). Open in Expo Go on the Android emulator.
2. Log in with valid credentials on the **first** attempt → must land directly on the `(tabs)` dashboard, no error, no stuck login screen.
3. Log out, kill + reopen (cold start), log in again first try → must succeed.
4. Confirm session restoration: kill + reopen with a valid stored token → arrives at `(tabs)` without re-login.
5. (If group guards added) Deep-link / navigate to a `trainer`/`athlete` route while logged out → redirected to `/(auth)/login`.
6. Regression: register flow still auto-logs-in and lands on `(tabs)`.

---

## Risks / notes

- `unstable_settings.initialRouteName` change (decision #1 above) must be consistent with the new first `<Stack.Screen>` to avoid a redirect detour on cold start.
- No backend changes required — this is purely a client navigation/gating fix.
- The `researcher` subagent (live-web ecosystem confirmation) was unavailable; the diagnosis rests on two code-level scouts + direct reading. If you want an extra confidence pass, a web/docs check of the expo-router "protected routes / conditional navigator" guidance can be done when web tools are available.
