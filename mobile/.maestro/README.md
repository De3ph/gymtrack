# GymTrack Mobile E2E Tests

Maestro flows for end-to-end testing of the GymTrack mobile app.

## Quick Start

```bash
# Run all flows
maestro test .maestro/

# Run a specific file (all flows in it)
maestro test .maestro/auth/login.yaml

# Run a single named flow within a file
maestro test .maestro/auth/login.yaml "Athlete Login"

# CI mode
maestro test --env CI=true .maestro/
```

## Prerequisites

1. **Backend** running on `localhost:8080`
2. **Expo dev server** running (`pnpm start` in `mobile/`)
3. **App installed** on device or emulator (`com.gymtrack.app`)
4. **Test users** exist in the database (see `.maestro/config.yaml` for credentials)

## Directory Structure

```
.maestro/
├── config.yaml               # Shared env config (appId, test credentials, base URL)
├── README.md                 # This file
├── auth/                     # Phase 2: Auth flow tests
│   ├── login.yaml            # Athlete login, trainer login, invalid creds, empty fields
│   ├── register.yaml         # Athlete register, trainer register, duplicate email
│   └── session-restore.yaml  # Kill app, reopen, session persists
├── athlete/                  # Phase 3: Core athlete flows
│   ├── workout-log.yaml      # Log workout (exercise, sets, reps, weight)
│   ├── meal-log.yaml         # Log meal (food, quantity, calories, macros)
│   ├── measurements.yaml     # Log body measurement (weight, BF%, parts)
│   ├── trainer-connect.yaml  # Browse catalog + send coaching request
│   └── workout-plans.yaml    # View assigned workout plans
└── trainer/                  # Phase 4: Trainer flows (planned)
```

## Auth Flows (Phase 2)

### login.yaml (4 flows)
| Flow | Description |
|------|-------------|
| **Athlete Login** | Login as athlete → land on dashboard |
| **Trainer Login** | Login as trainer → land on dashboard |
| **Invalid Credentials** | Wrong email/password → error shown |
| **Empty Fields Validation** | Submit with no input → validation error |

### register.yaml (3 flows)
| Flow | Description |
|------|-------------|
| **Athlete Registration** | Register new athlete → land on dashboard |
| **Trainer Registration** | Register new trainer → land on dashboard |
| **Duplicate Email Error** | Register with existing email → error shown |

### session-restore.yaml (1 flow)
| Flow | Description |
|------|-------------|
| **Session Restore** | Login → stop app → relaunch → still authenticated |

## Environment Variables

Defined in `config.yaml`, overridable via `--env KEY=VALUE`:

| Variable | Default | Purpose |
|----------|---------|---------|
| `ATHLETE_EMAIL` | `athlete@example.com` | Test athlete credentials |
| `ATHLETE_PASSWORD` | `Password123` | Test athlete password |
| `TRAINER_EMAIL` | `trainer@example.com` | Test trainer credentials |
| `TRAINER_PASSWORD` | `Password123` | Test trainer password |

## Athlete Flows (Phase 3)

### workout-log.yaml (1 flow)
| Flow | Description |
|------|-------------|
| **Log Workout** | Login → Workouts tab → + → fill exercise (Bench Press, 60kg, 10 reps) → submit → verify list |

### meal-log.yaml (1 flow)
| Flow | Description |
|------|-------------|
| **Log Meal** | Login → Meals tab → + → select Lunch → fill food (Grilled Chicken, 200g, 300cal, macros) → submit → verify list |

### measurements.yaml (1 flow)
| Flow | Description |
|------|-------------|
| **Log Measurement** | Login → Measurements tab → + → fill weight/BF%/notes/chest → save → verify list |

### trainer-connect.yaml (2 flows)
| Flow | Description |
|------|-------------|
| **Browse Trainer Catalog** | Login → dashboard quick action → catalog search visible |
| **Send Coaching Request** | Login → catalog → tap trainer → Request Coaching → Send Request → confirmed |

### workout-plans.yaml (1 flow)
| Flow | Description |
|------|-------------|
| **View Workout Plans** | Login → deep link to /athlete/workout-plans → verify list or empty state |

## Notes

- Maestro **cannot mock APIs** — all flows require a real backend with seeded test data.
- `uniqueId()` in registration flows generates a unique suffix per run to avoid email collisions.
- `stopApp` (not `clearState`) is used in session-restore to preserve persisted tokens.
- All flows use `text:` selectors matching i18n keys from `messages/en.json`.
- Form fields use **placeholder text** as selectors (e.g. `"Exercise"`, `"75.0"`, `"e.g., Chicken Breast"`).
- Date fields are pre-filled with today's date and skipped in flows.
- Workout plans uses `openLink` deep link since the route is not in bottom tabs.
- Trainer catalog uses `point: "50%,30%"` to tap first card (no unique text selectors on list items).
