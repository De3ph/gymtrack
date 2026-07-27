# Mobile App E2E Testing Plan

## Current State
- Mobile project exists at `mobile/`, full screens, zero test infrastructure
- No test runner, no e2e framework, no test files
- Plan doc (`mobile-app.md`) says Maestro for mobile E2E — not installed
- Web app uses Playwright (4 spec files, API mocking via `page.route`)

## Tool Decision: Maestro

Maestro chosen over Detox and Playwright (mobile):

| Factor | Maestro | Detox | Playwright (mobile) |
|--------|---------|-------|---------------------|
| Setup | YAML flows, no code | Complex native build config | Only web emulation, not real native |
| React Native | First-class | First-class | WebView only |
| DOM screens | Works | Works | Native context blind |
| CI | `maestro test` | Needs iOS/Android emulator | Easy but fake |
| Learning | Low | Medium | Low |

Detox requires `wix/detox` build system integration and separate iOS/Android build configs — too heavy for strangler fig migration where half screens are webviews. Maestro runs against any installed app binary (Expo Go, dev build, EAS build) without code instrumentation.

## Plan

### Phase 1: Test Infrastructure

1. Install Maestro CLI (`maestro`)
2. Create `.maestro/` directory at mobile project root
3. Create `.maestro/maestro.yaml` shared env config (APP_ID, base URL)
4. Add `maestro` to devDependencies (optional, or use standalone CLI)
5. Add npm scripts:
   - `"e2e:local": "maestro test .maestro/"`
   - `"e2e:ci": "maestro test --env CI=true .maestro/"`
6. Prerequisite: start backend + Expo, run Maestro against running app

### Phase 2: Auth Flow Tests (Highest Priority)

- `.maestro/auth/login.yaml` — login athlete, login trainer, invalid credentials, empty fields
- `.maestro/auth/register.yaml` — register athlete, register trainer, duplicate email
- `.maestro/auth/session-restore.yaml` — kill app, reopen, session persists

### Phase 3: Core Athlete Flows

- `.maestro/athlete/workout-log.yaml` — tap Log Workout, fill form, submit, verify list
- `.maestro/athlete/meal-log.yaml` — same for meals
- `.maestro/athlete/measurements.yaml` — log body measurement
- `.maestro/athlete/trainer-connect.yaml` — browse catalog, send coaching request
- `.maestro/athlete/workout-plans.yaml` — view assigned plans

### Phase 4: Trainer Flows

- `.maestro/trainer/client-view.yaml` — view client list, tap client, see workouts/meals
- `.maestro/trainer/coaching-requests.yaml` — accept/reject coaching requests
- `.maestro/trainer/plans.yaml` — create, assign workout plan

### Phase 5: DOM Screen Coverage

- Write flows for screens still in DOM (`'use dom'` components)
- Maestro interacts with DOM through the WebView — `tapOn: "text"` works across boundaries

### Phase 6: CI Integration

- GitHub Actions workflow: start backend, build Expo, run Maestro on iOS simulator
- Reuse test scenarios from existing `test-scenarios.md` (154 scenarios)

## Maestro Flow Example

```yaml
# .maestro/auth/login.yaml
appId: com.gymtrack.app
---
- launchApp
- assertVisible: "Login"
- tapOn: "Email"
- inputText: "athlete@example.com"
- tapOn: "Password"
- inputText: "Password123"
- tapOn: "Login"
- assertVisible: "Dashboard"
```

## Phase 2 — Complete ✅

### Consolidated Auth Flow Files

Phase 1 created 8 individual flow files. Phase 2 consolidated them into 3 Maestro flow files with named flows, matching the plan spec (`login.yaml`, `register.yaml`, `session-restore.yaml`).

| File | Flows | Scenarios |
|------|-------|-----------|
| `.maestro/auth/login.yaml` | 4 named flows | Athlete login, Trainer login, Invalid credentials, Empty fields |
| `.maestro/auth/register.yaml` | 3 named flows | Athlete registration, Trainer registration, Duplicate email error |
| `.maestro/auth/session-restore.yaml` | 1 named flow | Login → stopApp → relaunch → still authenticated |

### Key changes from Phase 1
- **Consolidated** 8 individual files into 3 multi-flow files with `name:` labels
- **Fixed session-restore**: changed `clearState` → `stopApp` (clearState wipes persisted tokens, making the test always fail)
- **Password strength**: registration flows use `TestPass123!` (8+ chars with special character) to meet Zod validation
- **Added `name:` property** to each flow for Maestro test reporting and selective execution
- **Updated README.md** with flow tables, env var docs, and usage examples

### Notes
- Phase 1 individual files (e.g., `login-athlete.yaml`) still exist alongside the consolidated files — can be removed once CI uses the consolidated versions
- All text selectors verified against `messages/en.json` i18n keys and `LoginScreen.tsx`/`RegisterScreen.tsx` components

## Phase 1 — Complete ✅

- Maestro CLI 2.7.0 installed at `C:\maestro\bin\maestro.bat`
- Added to User PATH permanently
- `.maestro/` directory created with shared config + 8 auth flows
- npm scripts added: `e2e:local`, `e2e:ci`, `e2e:auth`, `e2e:athlete`, `e2e:trainer`

### Created Files
| File | Purpose |
|------|---------|
| `.maestro/maestro.yaml` | Shared env config (appId, test credentials, base URL) |
| `.maestro/README.md` | Usage instructions + prerequisites |
| `.maestro/auth/login-athlete.yaml` | Athlete login happy path |
| `.maestro/auth/login-trainer.yaml` | Trainer login happy path |
| `.maestro/auth/login-invalid.yaml` | Invalid credentials error |
| `.maestro/auth/login-empty-fields.yaml` | Empty fields validation |
| `.maestro/auth/register-athlete.yaml` | Athlete registration |
| `.maestro/auth/register-trainer.yaml` | Trainer registration |
| `.maestro/auth/register-duplicate-email.yaml` | Duplicate email error |
| `.maestro/auth/session-restore.yaml` | Kill app + reopen = still authed |

### Open Questions

1. **Real backend or mocked?** Web E2E mocks with `page.route`. Maestro cannot mock APIs — needs real backend running. Options: real backend with test database, or enable MSW in Expo app (MSW is React Native compatible per plan doc).

2. **Scenario mapping.** All 154 web scenarios from `test-scenarios.md` apply to mobile, but mobile needs different flows (native nav, swipe gestures, bottom sheets). Which scenarios map first?

3. **Maestro install method.** Standalone CLI or node package (`npm maestro`)?

## Dependency

Before E2E works: backend CORS must allow mobile origins (Phase 0 in `mobile-app.md`). Current CORS allows only `localhost:3000/3001`. Without fix, API calls from mobile device/emulator fail.
