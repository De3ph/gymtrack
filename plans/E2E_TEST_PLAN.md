# GymTrack E2E Test Plan (Playwright)

Phase 1 spec. Use cases + happy-path scenarios + form-validation cases. All status `todo`. Existing tests in `frontend/src/e2e/` ignored; extracted fresh from app surface.

## Conventions

Enforce in every implemented test:

- **Locators**: `getByRole` / `getByLabel` / `getByTestId`. No raw text or CSS selectors.
- **Mock backend**: `page.route(...)` in `test.beforeEach`. Mock Go API (see AGENTS.md endpoint list). No real backend needed.
- **Auth**: HttpOnly session cookie + in-memory token service + server `proxy.ts` role gates. `storageState` unreliable. Per-test mock-login in `beforeEach`: mock `/api/auth/login`, `/api/auth/session`, `/api/users/me`, then fill login form (or set cookies) to establish role before navigating to protected routes.
- **Assertions**: web-first `expect(...).toBeVisible()` / `toHaveURL()` / `toHaveText()`.
- **Grouping**: `test.describe` per feature. Happy-path block + **separate** `test.describe("form validations")` block.
- **Isolation**: each test independent; no cross-test deps; no conditional logic; no `test.skip`.
- **Routes**: import `ROUTES` + `DYNAMIC_ROUTES` from `@/lib/routes`.
- **File layout**: `src/e2e/<feature>/<feature>.spec.ts`.
- **Test IDs**: comment header per test (e.g. `// TRACK.1 ï¿½ Create workout`).
- **i18n**: tests run in default locale `en`; one use case covers `en` - `tr` switch.
- **Browser matrix**: chromium, firefox, webkit, mobile-chrome (per `playwright.config.ts`).

## Use Cases

### Domain: Landing, Auth, Navigation, i18n

#### Use Cases (happy path)

| # | Title | Expected Scenario | Status |
|---|-------|-------------------|--------|
| AUTH.1 | View Landing Page | Go to `ROUTES.HOME`. Assert hero section and Get Started call-to-action visible. | implemented |
| AUTH.2 | Register Athlete | Go to `ROUTES.REGISTER`. Select Athlete role. Fill username, email, password, confirmPassword, profile.name, age, weight, height, fitnessGoals. Submit. Assert redirect to `ROUTES.HOME` or `ROUTES.DASHBOARD`. | implemented |
| AUTH.3 | Register Trainer | Go to `ROUTES.REGISTER`. Select Trainer role. Fill username, email, password, confirmPassword, profile.name, certifications, specializations. Submit. Assert redirect to `ROUTES.HOME` or `ROUTES.DASHBOARD`. | implemented |
| AUTH.4 | Login Athlete | Go to `ROUTES.LOGIN`. Enter athlete credentials (mock `/api/auth/login` ï¿½ athlete role). Submit. Assert redirect to `ROUTES.DASHBOARD`. | implemented |
| AUTH.5 | Login Trainer | Go to `ROUTES.LOGIN`. Enter trainer credentials (mock ï¿½ trainer role). Submit. Assert redirect to `ROUTES.DASHBOARD`. | implemented |
| AUTH.6 | Logout | From authenticated dashboard, click logout. Assert redirect to `ROUTES.HOME`; session cookie cleared. | implemented |
| AUTH.7 | Session Recovery | Login. Refresh page. Assert user remains authenticated on dashboard (mock `/api/auth/session` + `/api/users/me`). | implemented |
| AUTH.8 | Unauth Redirect | Logged out, navigate to `ROUTES.DASHBOARD`. Assert redirect to `ROUTES.LOGIN` with `?redirect=` param. | implemented |
| AUTH.9 | Role-gate Redirect | Login as athlete. Navigate to `ROUTES.TRAINER_CLIENTS`. Assert redirect to `ROUTES.DASHBOARD` (proxy.ts role gate). | implemented |
| AUTH.10 | Locale Switch | Click `LanguageSwitcher`. Select Tï¿½rkï¿½e. Assert URL contains `/tr/` and page text updates to Turkish. | implemented |

#### Form Validation Tests

| # | Title | Field | Expected Validation | Status |
|---|-------|-------|---------------------|--------|
| AUTH.F1 | Login identifier required | `identifier` | Empty submit ï¿½ Email or username is required | implemented |
| AUTH.F2 | Login identifier format | `identifier` | Invalid (not email, not 3-30 alphanumeric) ï¿½ Please enter a valid email or username (3-30 alphanumeric characters) | implemented |
| AUTH.F3 | Login password required | `password` | Empty submit ï¿½ Password is required | implemented |
| AUTH.F4 | Register username short | `username` | < 3 chars ï¿½ Username must be at least 3 characters | implemented |
| AUTH.F5 | Register username chars | `username` | Non-alphanumeric ï¿½ Username must contain only letters and numbers | implemented |
| AUTH.F6 | Register email invalid | `email` | Malformed ï¿½ Invalid email address | implemented |
| AUTH.F7 | Register password short | `password` | < 8 chars ï¿½ Password must be at least 8 characters | implemented |
| AUTH.F8 | Register password mismatch | `confirmPassword` | Confirm ? password ï¿½ Passwords dont match | implemented |
| AUTH.F9 | Register name required | `profile.name` | Empty ï¿½ Name is required | implemented |
| AUTH.F10 | Register age bound | `profile.age` | > 120 ï¿½ Age must be less than 120 | todo |
| AUTH.F11 | Register weight bound | `profile.weight` | > 1000 ï¿½ Weight must be less than 1000 kg | todo |
| AUTH.F12 | Register height bound | `profile.height` | > 1000 ï¿½ Height must be less than 1000 kg | todo |

### Domain: Athlete Tracking (workouts, meals, measurements, comments)

#### Use Cases (happy path)

| # | Title | Expected Scenario | Status |
|---|-------|-------------------|--------|
| TRACK.1 | Create workout | Go to `ROUTES.ATHLETE_WORKOUTS`. Open `WorkoutForm`; select exercise via `ExerciseSelector`; add set with weight/reps/rest in `ExerciseSetInput`; set date + time; submit (mock POST `/api/workouts`). Assert new entry in `WorkoutList`. | todo |
| TRACK.2 | Edit workout (24h) | Click edit on recent workout (within 24h). Modify set in `EditWorkoutDialog`; save (mock PUT). Assert updated details in list. | todo |
| TRACK.3 | Delete workout (24h) | Click delete on recent workout; confirm in `DeleteWorkoutDialog` (mock DELETE). Assert entry removed. | todo |
| TRACK.4 | View workout history | Use `WorkoutFilterBar` for date range (mock GET with date params). Assert `WorkoutList` filtered. | todo |
| TRACK.5 | View workout calendar | Switch to calendar tab. Assert `WorkoutCalendar` renders events. | todo |
| TRACK.6 | Create meal | Go to `ROUTES.ATHLETE_MEALS`. Open `MealForm`; select mealType, add food item (food/quantity/calories/macros); set date + time; submit (mock POST). Assert entry in `MealList`. | todo |
| TRACK.7 | Edit meal (24h) | Click edit on recent meal. Modify quantity in `EditMealDialog`; save. Assert updated `MealCard`. | todo |
| TRACK.8 | Delete meal (24h) | Click delete on recent meal; confirm. Assert removed from list. | todo |
| TRACK.9 | View meal history | Use `MealFilterBar` for date range. Assert `MealList` filtered. | todo |
| TRACK.10 | Create body measurement | Go to `ROUTES.ATHLETE_MEASUREMENTS`. Fill `BodyMeasurementForm`: weight, bodyFatPct, parts (neck/chest/etc.), notes; submit (mock POST). Assert latest stats update. | todo |
| TRACK.11 | Edit measurement (24h) | Click edit on recent entry. Change weight in `EditBodyMeasurementDialog`; save. Assert list reflects change. | todo |
| TRACK.12 | Delete measurement (24h) | Click delete on recent entry; confirm. Assert entry removed. | todo |
| TRACK.13 | View measurement charts | Switch to charts tab. Assert `BodyMeasurementCharts` renders. | todo |
| TRACK.14 | View latest measurement | Assert latest measurement summary visible (mock GET `/api/measurements/latest`). | todo |
| TRACK.15 | Add comment | On a workout/meal/measurement, click comments. Fill `CommentForm` content; submit (mock POST `/api/comments`). Assert comment in `CommentThread`. | todo |
| TRACK.16 | Reply to comment | In `CommentThread`, click reply on existing comment. Fill reply content; submit. Assert nested comment visible. | todo |

#### Form Validation Tests

| # | Title | Field | Expected Validation | Status |
|---|-------|-------|---------------------|--------|
| TRACK.F1 | Workout weight negative | set `weight` | < 0 ï¿½ weight_non_negative | todo |
| TRACK.F2 | Workout reps min | set `reps` | < 1 or non-integer ï¿½ reps_min_one | todo |
| TRACK.F3 | Workout exercise required | `exerciseId` | Empty ï¿½ exercise_selection_required | todo |
| TRACK.F4 | Workout exercise name | `name` | Empty ï¿½ exercise_name_required | todo |
| TRACK.F5 | Workout sets min | `sets` | Empty array ï¿½ sets_min_one | todo |
| TRACK.F6 | Workout exercises min | `exercises` | Empty array ï¿½ exercises_min_one | todo |
| TRACK.F7 | Workout time format | `workoutTime` | Not HH:MM ï¿½ invalid_time_format | todo |
| TRACK.F8 | Meal food required | item `food` | Empty ï¿½ food_required | todo |
| TRACK.F9 | Meal quantity required | item `quantity` | Empty ï¿½ quantity_required | todo |
| TRACK.F10 | Meal calories negative | item `calories` | < 0 ï¿½ calories_non_negative | todo |
| TRACK.F11 | Meal macros negative | `protein`/`carbs`/`fats` | < 0 ï¿½ macro_non_negative | todo |
| TRACK.F12 | Meal items min | `items` | Empty array ï¿½ items_min_one | todo |
| TRACK.F13 | Meal type required | `mealType` | Not in enum [breakfast,lunch,dinner,snack] ï¿½ required | todo |
| TRACK.F14 | Meal time format | `mealTime` | Not HH:MM ï¿½ invalid_time_format | todo |
| TRACK.F15 | Measurement weight positive | `weight` | ? 0 ï¿½ Weight must be greater than 0; > 1000 ï¿½ Weight is unrealistically large | todo |
| TRACK.F16 | Measurement body fat range | `bodyFatPct` | < 0 ï¿½ Body fat cannot be negative; > 100 ï¿½ Body fat cannot exceed 100% | todo |
| TRACK.F17 | Measurement parts range | `parts[key].value` | < 0 ï¿½ Value cannot be negative; > 500 ï¿½ Value is unrealistically large | todo |
| TRACK.F18 | Measurement notes limit | `notes` | > 500 chars ï¿½ Notes cannot exceed 500 characters | todo |
| TRACK.F19 | Measurement time format | `measurementTime` | Not HH:MM ï¿½ Invalid time format | todo |
| TRACK.F20 | Comment content empty | `content` | Empty ï¿½ Comment cannot be empty | todo |
| TRACK.F21 | Comment content max | `content` | > 2000 chars ï¿½ Comment must be at most 2000 characters | todo |
### Domain: Athlete - Trainer Relations + Reviews

#### Use Cases (happy path)

| # | Title | Expected Scenario | Status |
|---|-------|-------------------|--------|
| REL.1 | Browse trainer catalog | Go to `ROUTES.ATHLETE_TRAINERS` (mock GET `/api/trainers`). Use filter (specialization/rating). Assert `TrainerCatalogCard` elements visible. | implemented |
| REL.2 | View trainer public profile | From catalog, click a trainer card. Assert redirect to `DYNAMIC_ROUTES.ATHLETE_TRAINERS_DETAIL(id)`; bio, availability, reviews list visible (mock `/api/trainers/:id`, `/api/trainers/:id/availability`, `/api/trainers/:id/reviews`). | implemented |
| REL.3 | Create coaching request | On trainer profile, click Request Coaching. Fill message in `CoachingRequestDialog`; submit (mock POST `/api/coaching-requests`). Assert dialog closes. | implemented |
| REL.4 | View my coaching requests | Go to `ROUTES.ATHLETE_REQUESTS` (mock GET `/api/coaching-requests/my`). Assert `CoachingRequestsList` shows pending request. | implemented |
| REL.5 | Accept trainer invitation | On `ROUTES.ATHLETE_TRAINERS`, open `AcceptInvitationDialog`; enter code; submit (mock POST `/api/relationships/accept`). Assert success + relationship active. | implemented |
| REL.6 | View my-trainer detail | Go to `DYNAMIC_ROUTES.ATHLETE_TRAINER_DETAIL(id)` (mock `/api/relationships/my-trainer`). Assert `MyTrainerProfile` + `RelationshipDetailsCard` (Status: active) visible. | implemented |
| REL.7 | Terminate relationship | On my-trainer detail, click terminate; confirm in `TerminateRelationshipDialog` (mock DELETE `/api/relationships/:id`). Assert redirect to trainers list. | implemented |
| REL.8 | View assigned workout plans | Go to `ROUTES.ATHLETE_WORKOUT_PLANS` (mock GET `/api/workout-plans` assigned). Assert `WorkoutPlanCard` elements visible. | implemented |
| REL.9 | View workout plan detail | Click View Plan on a card. Assert `PlanViewDialog` shows exercise names + sets/reps. | implemented |
| REL.10 | Create trainer review | On trainer profile, click Create Review. Select rating (1-5 stars), fill comment; submit (mock POST `/api/trainers/:id/reviews`). Assert review in list. | implemented |
| REL.11 | Edit own review | Click edit on own review. Change rating/comment; submit (mock PUT `/api/reviews/:id`). Assert updated content. | implemented |
| REL.12 | Delete own review | Click delete on own review; confirm (mock DELETE `/api/reviews/:id`). Assert review removed. | implemented |

#### Form Validation Tests

| # | Title | Field | Expected Validation | Status |
|---|-------|-------|---------------------|--------|
| REL.F1 | Coaching message required | `message` | Empty submit → required error | todo | (field is optional per current schema)
| REL.F2 | Invitation code required | `code` | Empty → required error | implemented |
| REL.F3 | Invitation code format | `code` | Invalid format/length → format error | implemented |
| REL.F4 | Review rating bounds | `rating` | Must be 1-5; default 5; star click updates within range | implemented |
| REL.F5 | Review comment required | `comment` | Empty → Comment cannot be empty (comment.ts) | todo | (field is optional per current schema)
| REL.F6 | Review comment max | `comment` | > 2000 chars → Comment must be at most 2000 characters | implemented |

### Domain: Trainer Management

#### Use Cases (happy path)

| # | Title | Expected Scenario | Status |
|---|-------|-------------------|--------|
| TRAIN.1 | View trainer dashboard | Login as trainer; go to `ROUTES.DASHBOARD`. Assert trainer dashboard heading + nav links. | todo |
| TRAIN.2 | View clients list | Go to `ROUTES.TRAINER_CLIENTS` (mock `/api/relationships/my-clients`). Assert client cards with name/email. | todo |
| TRAIN.3 | View client detail | Go to `DYNAMIC_ROUTES.TRAINER_CLIENT_DETAIL(username)` (mock client detail API). Assert client name + Overview tab active. | todo |
| TRAIN.4 | Switch client tabs | On client detail, click Workouts/Meals/Measurements/Progress/Plans tabs. Assert corresponding tab content renders. | todo |
| TRAIN.5 | Edit trainer profile | Go to `ROUTES.TRAINER_PROFILE` (mock `/api/trainers/me/profile`). Update bio + hourlyRate; save (mock PUT). Assert success message. | todo |
| TRAIN.6 | Add availability | On `ROUTES.TRAINER_PROFILE`, in `AvailabilityCard` click add for a day; set start/end; save (mock POST `/api/trainers/me/availability`). Assert slot added. | todo |
| TRAIN.7 | Delete availability | On trainer profile, click remove on existing slot (mock DELETE). Assert slot removed. | todo |
| TRAIN.8 | Generate invitation code | On `ROUTES.TRAINER_CLIENTS`, click Invite Athlete; click generate (mock POST `/api/relationships/invite`). Assert code displayed + copy button. | todo |
| TRAIN.9 | View coaching requests | Go to `ROUTES.TRAINER_REQUESTS` (mock `/api/coaching-requests/pending`). Assert pending requests list with athlete names + messages. | todo |
| TRAIN.10 | Accept coaching request | On requests page, click Accept on pending request (mock PUT `/api/coaching-requests/:id/accept`). Assert request status updates / removed. | todo |
| TRAIN.11 | Reject coaching request | On requests page, click Reject (mock PUT `/api/coaching-requests/:id/reject`). Assert request removed. | todo |
| TRAIN.12 | Terminate relationship | On client detail, click End Relationship; confirm in `TerminateRelationshipDialog` (mock DELETE `/api/relationships/:id`). Assert redirect to clients list. | todo |
| TRAIN.13 | Create workout plan | Go to `ROUTES.TRAINER_WORKOUT_PLANS`; click create. Fill name + exercise + sets (weight/reps/rest); submit (mock POST `/api/workout-plans`). Assert new plan in list. | todo |
| TRAIN.14 | Edit workout plan | Click edit on a plan; modify name/exercises; save (mock PUT). Assert changes saved. | todo |
| TRAIN.15 | Delete workout plan | Click delete on a plan; confirm (mock DELETE). Assert plan removed. | todo |
| TRAIN.16 | Assign plan to athlete | Click assign on a plan; select athlete(s) in `AssignPlanDialog`; submit (mock POST `/api/workout-plans/:id/assign`). Assert success. | todo |
| TRAIN.17 | View client plans tab | On client detail, click Plans tab. Assert list of plans assigned to client. | todo |
| TRAIN.18 | Comment on client workout | On client Workouts tab, open comments; type comment; submit (mock POST `/api/comments`). Assert comment added to thread. | todo |
| TRAIN.19 | Comment on client meal | On client Meals tab, open comments; type comment; submit. Assert comment added. | todo |

#### Form Validation Tests

| # | Title | Field | Expected Validation | Status |
|---|-------|-------|---------------------|--------|
| TRAIN.F1 | Workout plan name required | `name` | Empty ï¿½ Plan name is required | todo |
| TRAIN.F2 | Workout plan exercises min | `exercises` | Empty array ï¿½ At least one exercise is required | todo |
| TRAIN.F3 | Plan exercise required | `exerciseId` | Empty ï¿½ Exercise selection is required | todo |
| TRAIN.F4 | Plan exercise name | `name` | Empty ï¿½ Exercise name is required | todo |
| TRAIN.F5 | Plan sets min | `sets` | Empty array ï¿½ At least one set is required | todo |
| TRAIN.F6 | Plan reps min | set `reps` | < 1 ï¿½ Reps must be at least 1 | todo |
| TRAIN.F7 | Plan weight min | set `weight` | < 0 ï¿½ Weight must be positive | todo |
| TRAIN.F8 | Plan rest time min | set `restTime` | < 0 ï¿½ Rest time cannot be negative | todo |
| TRAIN.F9 | Comment content empty | `content` | Empty ï¿½ Comment cannot be empty | todo |
| TRAIN.F10 | Comment content max | `content` | > 2000 ï¿½ Comment must be at most 2000 characters | todo |
| TRAIN.F11 | Trainer profile name required | `name` | Empty ï¿½ Name is required | todo |

### Domain: Admin + Shared Profile + Dashboard

#### Use Cases (happy path)

| # | Title | Expected Scenario | Status |
|---|-------|-------------------|--------|
| ADMIN.1 | View admin dashboard | Login as admin; go to `ROUTES.ADMIN_DASHBOARD`. Assert admin heading + stats. | todo |
| ADMIN.2 | List all users | Go to `ROUTES.ADMIN_USERS` (mock `/api/admin/users`). Assert table with Username/Email/Role/Name columns. | todo |
| ADMIN.3 | Update user role | Go to `ROUTES.ADMIN_USERS`, click a user row ï¿½ detail. Change role (e.g. to trainer); confirm (mock PUT `/api/admin/users/:id`). Assert role badge updates. | todo |
| ADMIN.4 | Update user status | On user detail, change status (e.g. suspend); confirm. Assert status badge updates. | todo |
| ADMIN.5 | View admin profile | Go to `ROUTES.ADMIN_PROFILE`. Assert Admin Profile + account info (email/username). | todo |
| ADMIN.6 | Change admin password | On `ROUTES.ADMIN_PROFILE`, fill oldPassword/newPassword/confirmPassword; submit. Assert success message. | todo |
| ADMIN.7 | View moderation page | Go to `ROUTES.ADMIN_MODERATION`. Assert Moderation heading + comments table. | todo |
| ADMIN.8 | Filter moderated comments | On moderation page, use target-type combobox; select Workouts. Assert table refetches workout comments. | todo |
| ADMIN.9 | Delete moderated comment | Click trash on a comment row; confirm. Assert comment removed. | todo |
| ADMIN.10 | View own profile | Go to `ROUTES.PROFILE`. Assert avatar, name, email, Personal Information section. | todo |
| ADMIN.11 | Edit own profile | On `ROUTES.PROFILE`, click edit. Update name/age; save (mock PUT `/api/users/me`). Assert Profile saved success. | todo |
| ADMIN.12 | View athlete dashboard | Login as athlete; go to `ROUTES.DASHBOARD`. Assert athlete dashboard content + metrics + `CombinedTrainingCalendar`. | todo |
| ADMIN.13 | View trainer dashboard | Login as trainer; go to `ROUTES.DASHBOARD`. Assert trainer dashboard content + clients metric + action buttons. | todo |
| ADMIN.14 | Browse exercise catalog | In workout flow, open `ExerciseSelector`. Use `ExerciseFilters` (muscle group dropdown). Assert `ExerciseCard` list updates. | todo |

#### Form Validation Tests

| # | Title | Field | Expected Validation | Status |
|---|-------|-------|---------------------|--------|
| ADMIN.F1 | Password fields required | all password fields | Any empty + submit ï¿½ All password fields are required | todo |
| ADMIN.F2 | New password min length | `newPassword` | < 8 chars ï¿½ New password must be at least 8 characters | todo |
| ADMIN.F3 | Password confirm match | `confirmPassword` | ? newPassword ï¿½ New passwords do not match | todo |
| ADMIN.F4 | Password must be new | `newPassword` | = oldPassword ï¿½ New password must differ from current password | todo |
| ADMIN.F5 | Profile name required | `name` | Empty ï¿½ Name is required | todo |
| ADMIN.F6 | Profile age bound | `age` | > 120 ï¿½ Age must be less than 120 | todo |
| ADMIN.F7 | Profile weight bound | `weight` | > 1000 ï¿½ Weight must be less than 1000 kg | todo |
| ADMIN.F8 | Profile height bound | `height` | > 1000 ï¿½ Height must be less than 1000 kg | todo |

## Summary

- Happy-path use cases: 71 (AUTH 10, TRACK 16, REL 12, TRAIN 19, ADMIN 14)
- Form-validation cases: 58 (AUTH 12, TRACK 21, REL 6, TRAIN 11, ADMIN 8)
- REL implemented: 12/12 happy-path + 4/6 form-validation (F1, F5 deferred: fields are optional per current schema)
- Implementation: after spec review, write `src/e2e/<feature>/<feature>.spec.ts` per use case; mark status `implemented` as each lands.
