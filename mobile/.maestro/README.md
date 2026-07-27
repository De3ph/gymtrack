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
4. **Test users** exist in the database (see `.maestro/maestro.yaml` for credentials)

## Directory Structure

```
.maestro/
├── maestro.yaml              # Shared env config (appId, test credentials, base URL)
├── README.md                 # This file
├── auth/                     # Phase 2: Auth flow tests
│   ├── login.yaml            # Athlete login, trainer login, invalid creds, empty fields
│   ├── register.yaml         # Athlete register, trainer register, duplicate email
│   └── session-restore.yaml  # Kill app, reopen, session persists
├── athlete/                  # Phase 3: Core athlete flows (planned)
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

Defined in `maestro.yaml`, overridable via `--env KEY=VALUE`:

| Variable | Default | Purpose |
|----------|---------|---------|
| `ATHLETE_EMAIL` | `athlete@example.com` | Test athlete credentials |
| `ATHLETE_PASSWORD` | `Password123` | Test athlete password |
| `TRAINER_EMAIL` | `trainer@example.com` | Test trainer credentials |
| `TRAINER_PASSWORD` | `Password123` | Test trainer password |

## Notes

- Maestro **cannot mock APIs** — all flows require a real backend with seeded test data.
- `uniqueId()` in registration flows generates a unique suffix per run to avoid email collisions.
- `stopApp` (not `clearState`) is used in session-restore to preserve persisted tokens.
- All flows use `text:` selectors matching i18n keys from `messages/en.json`.