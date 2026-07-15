# GymTrack E2E Test Scenarios

This document contains comprehensive E2E (End-to-End) test scenarios for the GymTrack fitness tracking application. Tests are implemented with Playwright.

## Playwright Test Organization

Each subsection (`###`) maps to a Playwright `test.describe` or `test.describe.serial` block in its own spec file under `src/e2e/`. Auth-adjacent tests that share mock state (e.g. login) use `.serial` to ensure predictable execution order.

| Playwright describe block | File | Type |
|---|---|---|
| `Login` | `src/e2e/login/login.spec.ts` | `.serial` |
| `Registration` | `src/e2e/register/register.spec.ts` | parallel |
| `Navigation` | `src/e2e/navigation/navigation.spec.ts` | parallel |
| `Profile` | `src/e2e/profile/profile.spec.ts` | parallel |
| `TrainerCatalog` | `src/e2e/trainers/catalog.spec.ts` | parallel |
| `CoachingRequests` | `src/e2e/coaching/requests.spec.ts` | parallel |
| `CoachingInvitations` | `src/e2e/coaching/invitations.spec.ts` | parallel |
| `WorkoutLogging` | `src/e2e/workouts/logging.spec.ts` | parallel |
| `WorkoutHistory` | `src/e2e/workouts/history.spec.ts` | parallel |
| `MealLogging` | `src/e2e/meals/logging.spec.ts` | parallel |
| `MealHistory` | `src/e2e/meals/history.spec.ts` | parallel |
| `ClientDashboard` | `src/e2e/trainer/clients.spec.ts` | parallel |
| `Comments` | `src/e2e/comments/comments.spec.ts` | parallel |
| `AthleteNavigation` | `src/e2e/navigation/athlete-nav.spec.ts` | parallel |
| `TrainerNavigation` | `src/e2e/navigation/trainer-nav.spec.ts` | parallel |
| `RoleSecurity` | `src/e2e/navigation/role-security.spec.ts` | parallel |
| `BodyMeasurements` | `src/e2e/measurements/measurements.spec.ts` | parallel |
| `WorkoutPlans` | `src/e2e/workout-plans/plans.spec.ts` | parallel |
| `TrainerReviews` | `src/e2e/reviews/reviews.spec.ts` | parallel |
| `AdminDashboard` | `src/e2e/admin/admin.spec.ts` | parallel |
| `ErrorHandling` | `src/e2e/errors/error-handling.spec.ts` | parallel |
| `Dashboard` | `src/e2e/dashboard/dashboard.spec.ts` | parallel |

---

## 1. Authentication

### 1.1 Login — `test.describe.serial("Login", ...)`

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|--------|
| 1.1.1 | Login | Successful login with valid credentials (athlete role) | Redirects to `/` (dashboard) | todo |
| 1.1.2 | Login | Successful login with valid credentials (trainer role) | Redirects to `/` (dashboard) | todo |
| 1.1.3 | Login | Login with invalid email/username format | Shows error message "Please enter a valid email or username (3-30 alphanumeric characters)" | todo |
| 1.1.4 | Login | Login with invalid password | Shows error message "Login failed. Please try again." | todo |
| 1.1.5 | Login | Login with empty email/username field | Shows validation error "Email or username is required" | todo |
| 1.1.6 | Login | Login with empty password field | Shows validation error "Password is required" | todo |
| 1.1.7 | Login | Login with short password (< 8 chars) | Shows validation error "Password must be at least 6 characters" | todo |
| 1.1.8 | Login | Submit button shows loading spinner while authenticating | Button disabled, "Logging in..." text visible | todo |

### 1.2 Registration — `test.describe("Registration", ...)`

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|--------|
| 1.2.1 | Registration | Register new athlete with all required fields | Account created, auto-login, redirects to home | todo |
| 1.2.2 | Registration | Register new trainer with all required fields | Account created, auto-login, redirects to home | todo |
| 1.2.3 | Registration | Registration with mismatched passwords | Shows error "Passwords do not match" | todo |
| 1.2.4 | Registration | Registration with invalid email format | Shows error "Please enter a valid email" | todo |
| 1.2.5 | Registration | Registration with short password (< 8 chars) | Shows error "Password must be at least 6 characters" | todo |
| 1.2.6 | Registration | Role selection (Athlete) shows athlete-specific fields | Age, weight, height, fitness goals visible | todo |
| 1.2.7 | Registration | Role selection (Trainer) shows trainer-specific fields | Certifications, specializations visible | todo |
| 1.2.8 | Registration | Registration with empty username | Shows error "Username is required" | todo |
| 1.2.9 | Registration | Registration with short username (< 3 chars) | Shows error "Username must be at least 3 characters" | todo |
| 1.2.10 | Registration | Registration with empty name field | Shows error "Name is required" | todo |

### 1.3 Auth Navigation — `test.describe("Navigation", ...)`

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|--------|
| 1.3.1 | Navigation | Click "Sign up" link on login page | Navigates to register page | todo |
| 1.3.2 | Navigation | Click "Login" link on register page | Navigates to login page | todo |

---

## 2. User Profile Management

### 2.1 View Profile — `test.describe("Profile", ...)`

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|--------|
| 2.1.1 | View Profile | Athlete views their profile page | Displays name, email, role, age, weight, height, fitness goals | todo |
| 2.1.2 | View Profile | Trainer views their profile page | Displays name, email, role, certifications, specializations | todo |
| 2.1.3 | View Profile | View assigned trainer on athlete profile | Shows "My Trainer" section when trainer assigned | todo |
| 2.1.4 | View Profile | View invitation dialog on athlete profile (no trainer) | Shows "Accept Invitation" or "Connect" button | todo |
| 2.1.5 | View Profile | Trainer views their trainer-specific profile page (`/trainer/profile`) | Displays availability, public profile fields | todo |

### 2.2 Edit Profile — `test.describe("Profile", ...)`

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|--------|
| 2.2.1 | Edit Profile | Athlete clicks Edit Profile button | Form switches to edit mode | todo |
| 2.2.2 | Edit Profile | Athlete updates name, age, weight, height | Changes saved successfully | todo |
| 2.2.3 | Edit Profile | Trainer updates certifications, specializations | Changes saved successfully | todo |
| 2.2.4 | Edit Profile | Save changes and refresh page | New data persists | todo |
| 2.2.5 | Edit Profile | Click Cancel button | Discards changes, returns to view mode | todo |
| 2.2.6 | Edit Profile | Submit with empty name field | Shows validation error "Name is required" | todo |

---

## 3. Trainer-Athlete Relationships

### 3.1 Trainer Catalog (Athlete) — `test.describe("TrainerCatalog", ...)`

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|--------|
| 3.1.1 | Browse Trainers | Athlete navigates to trainer catalog (`/athlete/trainers`) | Displays list of available trainers | todo |
| 3.1.2 | Browse Trainers | View trainer card with name, certifications, specializations, rating | All information displayed correctly | todo |
| 3.1.3 | Browse Trainers | Click trainer card to view detail page | Navigates to `/athlete/trainers/[id]` | todo |
| 3.1.4 | Browse Trainers | View trainer detail page | Shows full profile, availability, reviews | todo |

### 3.2 Send Coaching Request — `test.describe("CoachingRequests", ...)`

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|--------|
| 3.2.1 | Send Request | Athlete sends coaching request with message | Request sent, confirmation shown | todo |
| 3.2.2 | Send Request | Athlete sends coaching request without message | Default message auto-filled | todo |
| 3.2.3 | Send Request | Click "Send Request" button opens dialog | Dialog opens with form | todo |

### 3.3 View Coaching Requests — `test.describe("CoachingRequests", ...)`

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|--------|
| 3.3.1 | View Requests | Athlete views their sent requests page (`/athlete/requests`) | Lists all requests with status (pending/accepted/declined) | todo |
| 3.3.2 | View Requests | Trainer views received requests (`/trainer/requests`) | Lists pending requests from athletes | todo |

### 3.4 Handle Coaching Request (Trainer) — `test.describe("CoachingRequests", ...)`

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|--------|
| 3.4.1 | Accept Request | Trainer accepts athlete request | Status changes to "accepted", athlete added to client list | todo |
| 3.4.2 | Decline Request | Trainer declines athlete request | Status changes to "declined" | todo |

### 3.5 Handle Invitation (Athlete) — `test.describe("CoachingInvitations", ...)`

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|--------|
| 3.5.1 | Accept Invitation | Athlete accepts trainer invitation | Relationship established, trainer shown in profile | todo |
| 3.5.2 | Decline Invitation | Athlete declines trainer invitation | Invitation removed | todo |
| 3.5.3 | Generate Code | Trainer generates invitation code | Code displayed, athlete can use it to connect | todo |

### 3.6 View Assigned Trainer — `test.describe("CoachingInvitations", ...)`

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|--------|
| 3.6.1 | View Trainer | Athlete views their assigned trainer (`/athlete/my-trainer/[id]`) | Shows trainer name, contact info, relationship details | todo |
| 3.6.2 | Navigation | "Browse Trainers" button navigates to trainer list | Navigates to `/athlete/trainers` | todo |
| 3.6.3 | Terminate | Trainer terminates relationship with athlete | Relationship ended, confirmation shown | todo |

---

## 4. Workout Tracking (Athlete)

### 4.1 Log Workout — `test.describe("WorkoutLogging", ...)`

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|--------|
| 4.1.1 | Log Workout | Create new workout with single exercise | Workout created, appears in history | todo |
| 4.1.2 | Log Workout | Create new workout with multiple exercises | All exercises saved | todo |
| 4.1.3 | Log Workout | Add sets with weight, reps, rest time per set | Set data saved correctly | todo |
| 4.1.4 | Log Workout | Remove exercise from workout form | Exercise removed | todo |
| 4.1.5 | Log Workout | Click "Add Exercise" button | New exercise card added to form | todo |
| 4.1.6 | Log Workout | Select date and time for workout | Date/time saved correctly | todo |
| 4.1.7 | Log Workout | Submit workout form | Workout saved, success message shown | todo |

### 4.2 Exercise Selector — `test.describe("WorkoutLogging", ...)`

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|--------|
| 4.2.1 | Exercise Selector | Search for exercise in dropdown | Filtered results shown | todo |
| 4.2.2 | Exercise Selector | Select exercise from list | Exercise name populated | todo |
| 4.2.3 | Exercise Selector | Enter custom exercise name | Custom name saved | todo |

### 4.3 View Workout History — `test.describe("WorkoutHistory", ...)`

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|--------|
| 4.3.1 | View History | View workout list page | Displays chronological list of workouts | todo |
| 4.3.2 | View History | View workout calendar | Calendar view with workout dates highlighted | todo |
| 4.3.3 | View History | Navigate to different months in calendar | Calendar data updates | todo |
| 4.3.4 | View History | Click on a workout in the list | Expands/shows workout detail with exercises and sets | todo |

### 4.4 Filter Workouts — `test.describe("WorkoutHistory", ...)`

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|--------|
| 4.4.1 | Filter | Filter workouts by date range | Only workouts in range displayed | todo |
| 4.4.2 | Filter | Filter workouts by exercise type | Only matching exercises shown | todo |

### 4.5 Edit/Delete Workout — `test.describe("WorkoutLogging", ...)`

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|--------|
| 4.5.1 | Edit Workout | Edit workout within 24 hours | Changes saved successfully | todo |
| 4.5.2 | Edit Workout | Edit workout after 24 hours | Error shown "Cannot edit past workouts" | todo |
| 4.5.3 | Delete Workout | Delete workout within 24 hours | Workout removed from list | todo |
| 4.5.4 | Delete Workout | Delete workout after 24 hours | Error shown "Cannot delete past workouts" | todo |

### 4.6 Validation — `test.describe("WorkoutLogging", ...)`

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|--------|
| 4.6.1 | Validation | Submit workout without exercise selected | Validation error shown | todo |
| 4.6.2 | Validation | Submit workout with invalid weight value | Validation error shown | todo |

---

## 5. Meal Tracking (Athlete)

### 5.1 Log Meal — `test.describe("MealLogging", ...)`

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|--------|
| 5.1.1 | Log Meal | Create meal with single food item | Meal created, appears in history | todo |
| 5.1.2 | Log Meal | Create meal with multiple food items | All items saved | todo |
| 5.1.3 | Log Meal | Select meal type (breakfast/lunch/dinner/snack) | Meal type saved | todo |
| 5.1.4 | Log Meal | Add calories for food item | Calories saved | todo |
| 5.1.5 | Log Meal | Add macros (protein, carbs, fats) | Macros saved | todo |
| 5.1.6 | Log Meal | Add quantity for food items | Quantity saved | todo |
| 5.1.7 | Log Meal | Remove food item from meal | Item removed | todo |
| 5.1.8 | Log Meal | Click "Add Food Item" button | New food item card added | todo |
| 5.1.9 | Log Meal | Select date and time for meal | Date/time saved correctly | todo |
| 5.1.10 | Log Meal | Submit meal form | Meal saved, success message shown | todo |

### 5.2 View Meal History — `test.describe("MealHistory", ...)`

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|--------|
| 5.2.1 | View History | View meal list page | Displays chronological list of meals | todo |
| 5.2.2 | View History | View meal calendar | Calendar view with meal dates highlighted | todo |
| 5.2.3 | View History | Navigate to different months in calendar | Calendar data updates | todo |

### 5.3 Daily Nutrition Summary — `test.describe("MealHistory", ...)`

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|--------|
| 5.3.1 | Daily Summary | View daily nutrition summary | Shows total calories and macro breakdown | todo |

### 5.4 Filter Meals — `test.describe("MealHistory", ...)`

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|--------|
| 5.4.1 | Filter | Filter meals by date range | Only meals in range displayed | todo |
| 5.4.2 | Filter | Filter meals by meal type | Only matching meals shown | todo |

### 5.5 Edit/Delete Meal — `test.describe("MealLogging", ...)`

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|--------|
| 5.5.1 | Edit Meal | Edit existing meal | Changes saved successfully | todo |
| 5.5.2 | Delete Meal | Delete meal | Meal removed from list | todo |

### 5.6 Validation — `test.describe("MealLogging", ...)`

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|--------|
| 5.6.1 | Validation | Submit meal without food name | Validation error shown | todo |
| 5.6.2 | Validation | Submit meal with negative calories | Validation error shown | todo |

---

## 6. Trainer Dashboard

### 6.1 Client List — `test.describe("ClientDashboard", ...)`

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|--------|
| 6.1.1 | Client List | Trainer views clients page (`/trainer/clients`) | Displays list of assigned athletes | todo |
| 6.1.2 | Client Card | View client card | Shows name, email, fitness goals, start date | todo |
| 6.1.3 | Navigation | Click "View Details" on client card | Navigates to `/trainer/client/[username]` | todo |

### 6.2 Client Details — `test.describe("ClientDashboard", ...)`

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|--------|
| 6.2.1 | Client Workouts | View client's workout history | Lists all workouts | todo |
| 6.2.2 | Client Workouts | Filter client workouts by date range | Only workouts in range displayed | todo |
| 6.2.3 | Client Meals | View client's meal logs | Lists all meals | todo |
| 6.2.4 | Client Meals | Filter client meals by date range | Only meals in range displayed | todo |
| 6.2.5 | Progress Charts | View client progress charts | Charts display workout/nutrition trends | todo |
| 6.2.6 | Overview | View Overview tab | Shows summary of client's progress | todo |
| 6.2.7 | Measurements | View client's body measurements tab | Measurement history displayed | todo |
| 6.2.8 | Workout Plans | View client's assigned workout plans tab | Plans listed with status | todo |

### 6.3 Client Tabs — `test.describe("ClientDashboard", ...)`

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|--------|
| 6.3.1 | Tabs | Switch between Overview/Workouts/Meals/Progress tabs | Correct content displayed | todo |

---

## 7. Comments & Feedback

### 7.1 Add Comment — `test.describe("Comments", ...)`

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|--------|
| 7.1.1 | Add Comment | Trainer adds comment on workout | Comment saved, visible on workout | todo |
| 7.1.2 | Add Comment | Trainer adds comment on meal | Comment saved, visible on meal | todo |
| 7.1.3 | View Comments | View comment thread on workout | All comments displayed with timestamps | todo |
| 7.1.4 | View Comments | Comment count displayed | Shows "(N)" count | todo |

### 7.2 Reply to Comment — `test.describe("Comments", ...)`

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|--------|
| 7.2.1 | Reply | Athlete replies to trainer comment | Reply saved as nested comment | todo |
| 7.2.2 | Reply | Trainer replies to athlete response | Reply saved as nested comment | todo |

### 7.3 Edit/Delete Comment — `test.describe("Comments", ...)`

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|--------|
| 7.3.1 | Edit Comment | Edit own comment | Changes saved | todo |
| 7.3.2 | Delete Comment | Delete own comment | Comment removed | todo |

### 7.4 Threaded View — `test.describe("Comments", ...)`

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|--------|
| 7.4.1 | Threaded View | View nested comment thread | Replies indented correctly | todo |

---

## 8. Navigation & Routing

### 8.1 Athlete Navigation — `test.describe("AthleteNavigation", ...)`

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|--------|
| 8.1.1 | Navigation | Sidebar displays for athlete | Workouts, Meals, Measurements, Trainers, Requests, Workout Plans, Profile shown | todo |
| 8.1.2 | Navigation | Click Workouts in sidebar | Navigates to `/athlete/workouts` | todo |
| 8.1.3 | Navigation | Click Meals in sidebar | Navigates to `/athlete/meals` | todo |
| 8.1.4 | Navigation | Click Measurements in sidebar | Navigates to `/athlete/measurements` | todo |
| 8.1.5 | Navigation | Click Trainers in sidebar | Navigates to `/athlete/trainers` | todo |
| 8.1.6 | Navigation | Click Requests in sidebar | Navigates to `/athlete/requests` | todo |
| 8.1.7 | Navigation | Click Workout Plans in sidebar | Navigates to `/athlete/workout-plans` | todo |
| 8.1.8 | Navigation | Click Profile in sidebar | Navigates to `/profile` | todo |

### 8.2 Trainer Navigation — `test.describe("TrainerNavigation", ...)`

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|--------|
| 8.2.1 | Navigation | Sidebar displays for trainer | Clients, Requests, Workout Plans, Profile shown | todo |
| 8.2.2 | Navigation | Click Clients in sidebar | Navigates to `/trainer/clients` | todo |
| 8.2.3 | Navigation | Click Requests in sidebar | Navigates to `/trainer/requests` | todo |
| 8.2.4 | Navigation | Click Workout Plans in sidebar | Navigates to `/trainer/workout-plans` | todo |
| 8.2.5 | Navigation | Click Profile in sidebar | Navigates to `/profile` | todo |

### 8.3 Security — `test.describe("RoleSecurity", ...)`

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|--------|
| 8.3.1 | Role Redirect | Unauthenticated user tries to access protected route | Redirected to login page with redirect param | todo |
| 8.3.2 | Role Redirect | Athlete tries to access /trainer/* | Redirected to appropriate page | todo |
| 8.3.3 | Role Redirect | Trainer tries to access /athlete/* | Redirected to appropriate page | todo |
| 8.3.4 | Role Redirect | Non-admin tries to access /admin/* | Redirected to dashboard | todo |
| 8.3.5 | Auth Guard | Session cookie expired | Redirected to login on protected route | todo |

---

## 9. Error Handling

### 9.1 API Errors — `test.describe("ErrorHandling", ...)`

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|--------|
| 9.1.1 | API Error | Network connectivity lost | "Network error" message displayed | todo |
| 9.1.2 | API Error | Server returns 5xx error | User-friendly error message displayed | todo |
| 9.1.3 | API Error | Token refresh fails on 401 | Redirected to login page | todo |

### 9.2 Form Validation — `test.describe("ErrorHandling", ...)`

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|--------|
| 9.2.1 | Validation | Submit with invalid data | Field-level errors displayed | todo |
| 9.2.2 | Loading State | Submit form while loading | Button disabled, loading spinner shown | todo |

### 9.3 Empty States — `test.describe("ErrorHandling", ...)`

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|--------|
| 9.3.1 | Empty State | No workouts logged | "No workouts found" message displayed | todo |
| 9.3.2 | Empty State | No meals logged | "No meals found" message displayed | todo |
| 9.3.3 | Empty State | No clients assigned | "No clients" message displayed | todo |
| 9.3.4 | Empty State | No measurements recorded | "No measurements" message displayed | todo |
| 9.3.5 | Empty State | No workout plans assigned | "No plans" message displayed | todo |

### 9.4 Loading States — `test.describe("ErrorHandling", ...)`

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|--------|
| 9.4.1 | Loading | Page loading | Loading spinner displayed | todo |
| 9.4.2 | Loading | Form submitting | Loading indicator on button | todo |

---

## 10. Body Measurements (Athlete)

Route: `/athlete/measurements`
Components: `BodyMeasurementForm`, `BodyMeasurementList`, `BodyMeasurementListItem`, `BodyMeasurementCharts`, `BodyMeasurementFilterBar`, `EditBodyMeasurementDialog`, `DeleteBodyMeasurementDialog`

### 10.1 Log Measurement — `test.describe("BodyMeasurements", ...)`

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|--------|
| 10.1.1 | Log Measurement | Athlete navigates to measurements page | Page loads with measurement form and history | todo |
| 10.1.2 | Log Measurement | Log new measurement with weight, body fat % | Measurement saved, appears in list | todo |
| 10.1.3 | Log Measurement | Add optional notes to measurement | Notes saved with measurement | todo |
| 10.1.4 | Log Measurement | Select date for measurement | Date saved correctly | todo |
| 10.1.5 | Log Measurement | Submit measurement form | Measurement saved, success message shown | todo |
| 10.1.6 | Log Measurement | Log multiple measurements over different dates | All measurements appear in chronological order | todo |

### 10.2 View Measurement History — `test.describe("BodyMeasurements", ...)`

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|--------|
| 10.2.1 | View History | View measurement list | Displays chronological list of measurements | todo |
| 10.2.2 | View Charts | View measurement trend charts | Charts display weight/body fat trends over time | todo |
| 10.2.3 | Filter | Filter measurements by date range | Only measurements in range displayed | todo |

### 10.3 Edit/Delete Measurement — `test.describe("BodyMeasurements", ...)`

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|--------|
| 10.3.1 | Edit Measurement | Edit existing measurement | Changes saved successfully | todo |
| 10.3.2 | Delete Measurement | Delete measurement | Measurement removed from list | todo |

### 10.4 Validation — `test.describe("BodyMeasurements", ...)`

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|--------|
| 10.4.1 | Validation | Submit with negative weight | Validation error shown | todo |
| 10.4.2 | Validation | Submit with empty date field | Validation error shown | todo |

---

## 11. Workout Plans

Routes: `/athlete/workout-plans` (athlete view), `/trainer/workout-plans` (trainer management), `/trainer/workout-plans/[id]` (plan detail)
Components: `WorkoutPlanForm`, `WorkoutPlanCard`, `WorkoutPlanList`, `PlanSetInput`, `PlanViewDialog`, `AssignPlanDialog`, `ClientPlansTab`, `MyWorkoutPlans`

### 11.1 Athlete Workout Plans — `test.describe("WorkoutPlans", ...)`

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|--------|
| 11.1.1 | View Plans | Athlete navigates to workout plans page | Displays list of assigned workout plans | todo |
| 11.1.2 | View Plan Detail | Athlete clicks on a plan | Plan detail shown with exercises and sets | todo |
| 11.1.3 | Start Workout | Athlete starts workout from plan | Redirects to workout page with plan exercises pre-filled | todo |
| 11.1.4 | Empty State | Athlete has no assigned plans | "No workout plans" message displayed | todo |

### 11.2 Trainer Workout Plans — `test.describe("WorkoutPlans", ...)`

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|--------|
| 11.2.1 | Create Plan | Trainer creates new workout plan with name and description | Plan created, appears in plans list | todo |
| 11.2.2 | Add Exercises | Trainer adds exercises to plan with sets, reps, weight | Exercises saved correctly | todo |
| 11.2.3 | View Plans | Trainer views their workout plans list | Displays all created plans | todo |
| 11.2.4 | View Plan Detail | Trainer clicks on a plan to view detail | Plan detail shown with all exercises | todo |
| 11.2.5 | Edit Plan | Trainer edits plan name, description, exercises | Changes saved successfully | todo |
| 11.2.6 | Delete Plan | Trainer deletes a workout plan | Plan removed from list | todo |
| 11.2.7 | Assign Plan | Trainer assigns plan to client(s) | Plan assigned, athlete can see it | todo |
| 11.2.8 | Client Plans | Trainer views client's assigned plans tab | Plans for that client displayed | todo |

### 11.3 Validation — `test.describe("WorkoutPlans", ...)`

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|--------|
| 11.3.1 | Validation | Create plan without name | Validation error shown | todo |
| 11.3.2 | Validation | Add exercise without selecting exercise | Validation error shown | todo |

---

## 12. Admin Dashboard

Routes: `/admin`, `/admin/users`, `/admin/users/[id]`, `/admin/profile`

### 12.1 Admin Access — `test.describe("AdminDashboard", ...)`

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|--------|
| 12.1.1 | Dashboard | Admin navigates to admin dashboard | Dashboard displays with system overview | todo |
| 12.1.2 | User List | Admin navigates to users management | Lists all users with roles | todo |
| 12.1.3 | User Detail | Admin clicks on a user | User detail page with profile info | todo |
| 12.1.4 | Profile | Admin views their profile | Profile page displays correctly | todo |
| 12.1.5 | Security | Non-authenticated user tries to access /admin | Redirected to login | todo |
| 12.1.6 | Security | Non-admin authenticated user tries to access /admin | Redirected to dashboard | todo |

---

## 13. Trainer Reviews

Components: `CreateReviewDialog`, `ReviewActions`

### 13.1 Reviews — `test.describe("TrainerReviews", ...)`

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|--------|
| 13.1.1 | View Reviews | View trainer reviews on trainer detail page | Reviews displayed with ratings and comments | todo |
| 13.1.2 | Create Review | Athlete creates a review with rating and comment | Review saved, appears in reviews list | todo |
| 13.1.3 | View Rating | Average rating displayed on trainer card | Rating shown with star display and count | todo |
| 13.1.4 | Validation | Submit review without rating | Validation error shown | todo |

---

## 14. Dashboard (Role-based Landing)

Route: `/` (role-based redirect in `(dashboard)/page.tsx`)
Components: `AthleteDashboardContent`, `TrainerDashboardContent`, `CombinedTrainingCalendar`, `QuickActionsPanel`, `DashboardShell`, `TodayClientList`

### 14.1 Dashboard — `test.describe("Dashboard", ...)`

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|--------|
| 14.1.1 | Athlete Dashboard | Athlete lands on dashboard | Shows workout/meal quick actions, recent activity, calendar | todo |
| 14.1.2 | Athlete Dashboard | Quick action buttons navigate correctly | "Log Workout" → `/athlete/workouts`, "Log Meal" → `/athlete/meals` | todo |
| 14.1.3 | Trainer Dashboard | Trainer lands on dashboard | Shows client list, recent activity, calendar | todo |
| 14.1.4 | Trainer Dashboard | Today client list shows active clients | Client cards with stats displayed | todo |
| 14.1.5 | Combined Calendar | Calendar shows both workouts and meals | Events displayed correctly on calendar | todo |
| 14.1.6 | Admin Redirect | Admin user lands on `/` | Redirected to `/admin` | todo |

---

## Summary

| Category | Number of Scenarios | Playwright Spec Files |
|----------|-------------------|----------------------|
| Authentication (Login + Register) | 16 | `login/login.spec.ts`, `register/register.spec.ts` |
| Auth Navigation | 2 | `navigation/navigation.spec.ts` |
| User Profile Management | 11 | `profile/profile.spec.ts` |
| Trainer-Athlete Relationships | 13 | `coaching/requests.spec.ts`, `coaching/invitations.spec.ts`, `trainers/catalog.spec.ts` |
| Workout Tracking | 17 | `workouts/logging.spec.ts`, `workouts/history.spec.ts` |
| Meal Tracking | 14 | `meals/logging.spec.ts`, `meals/history.spec.ts` |
| Trainer Dashboard | 10 | `trainer/clients.spec.ts` |
| Comments & Feedback | 7 | `comments/comments.spec.ts` |
| Navigation & Routing | 14 | `navigation/athlete-nav.spec.ts`, `navigation/trainer-nav.spec.ts`, `navigation/role-security.spec.ts` |
| Error Handling | 10 | `errors/error-handling.spec.ts` |
| Body Measurements | 10 | `measurements/measurements.spec.ts` |
| Workout Plans | 14 | `workout-plans/plans.spec.ts` |
| Trainer Reviews | 4 | `reviews/reviews.spec.ts` |
| Admin Dashboard | 6 | `admin/admin.spec.ts` |
| Dashboard (Landing) | 6 | `dashboard/dashboard.spec.ts` |
| **Total** | **154** | 18 spec files |

---

*Document generated: 2026-04-24*
*Last updated: 2026-07-15 — Added Body Measurements, Workout Plans, Admin Dashboard, Trainer Reviews, Dashboard sections. Updated for Playwright describe block structure. Fixed summary counts to match actual scenarios. Updated validation error messages to match i18n strings. Added routes and new navigation items.*
