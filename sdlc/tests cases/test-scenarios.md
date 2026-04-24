# GymTrack E2E Test Scenarios

This document contains comprehensive E2E (End-to-End) test scenarios for the GymTrack fitness tracking application.

---

## 1. Authentication

### 1.1 Login

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|---------------|--------|
| 1.1.1 | Login | Successful login with valid credentials (athlete role) | Redirects to workouts page | todo |
| 1.1.2 | Login | Successful login with valid credentials (trainer role) | Redirects to clients page | todo |
| 1.1.3 | Login | Login with invalid email | Shows error message "Invalid email address" | todo |
| 1.1.4 | Login | Login with invalid password | Shows error message "Login failed. Please try again." | todo |
| 1.1.5 | Login | Login with empty email field | Shows validation error "Email is required" | todo |
| 1.1.6 | Login | Login with empty password field | Shows validation error "Password is required" | todo |

### 1.2 Registration

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|---------------|--------|
| 1.2.1 | Registration | Register new athlete with all required fields | Account created, auto-login, redirects to home | todo |
| 1.2.2 | Registration | Register new trainer with all required fields | Account created, auto-login, redirects to home | todo |
| 1.2.3 | Registration | Registration with mismatched passwords | Shows error "Passwords do not match" | todo |
| 1.2.4 | Registration | Registration with invalid email format | Shows error "Invalid email address" | todo |
| 1.2.5 | Registration | Registration with short password (<6 chars) | Shows error "Password must be at least 6 characters" | todo |
| 1.2.6 | Registration | Role selection (Athlete) shows athlete-specific fields | Age, weight, height, fitness goals visible | todo |
| 1.2.7 | Registration | Role selection (Trainer) shows trainer-specific fields | Certifications, specializations visible | todo |

### 1.3 Navigation

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|---------------|--------|
| 1.3.1 | Navigation | Click "Sign up" link on login page | Navigates to register page | todo |
| 1.3.2 | Navigation | Click "Login" link on register page | Navigates to login page | todo |

---

## 2. User Profile Management

### 2.1 View Profile

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|---------------|--------|
| 2.1.1 | View Profile | Athlete views their profile page | Displays name, email, role, age, weight, height, fitness goals | todo |
| 2.1.2 | View Profile | Trainer views their profile page | Displays name, email, role, certifications, specializations | todo |
| 2.1.3 | View Profile | View assigned trainer on athlete profile | Shows "My Trainer" section when trainer assigned | todo |

### 2.2 Edit Profile

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|---------------|--------|
| 2.2.1 | Edit Profile | Athlete clicks Edit Profile button | Form switches to edit mode | todo |
| 2.2.2 | Edit Profile | Athlete updates name, age, weight, height | Changes saved successfully | todo |
| 2.2.3 | Edit Profile | Trainer updates certifications, specializations | Changes saved successfully | todo |
| 2.2.4 | Edit Profile | Save changes and refresh page | New data persists | todo |
| 2.2.5 | Edit Profile | Click Cancel button | Discards changes, returns to view mode | todo |
| 2.2.6 | Edit Profile | Submit with empty name field | Shows validation error "Name is required" | todo |

---

## 3. Trainer-Athlete Relationships

### 3.1 Trainer Catalog (Athlete)

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|---------------|--------|
| 3.1.1 | Browse Trainers | Athlete navigates to trainer catalog | Displays list of available trainers | todo |
| 3.1.2 | Browse Trainers | View trainer card with name, certifications, specializations | All information displayed correctly | todo |

### 3.2 Send Coaching Request

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|---------------|--------|
| 3.2.1 | Send Request | Athlete sends coaching request with message | Request sent, confirmation shown | todo |
| 3.2.2 | Send Request | Athlete sends coaching request without message | Default message auto-filled | todo |
| 3.2.3 | Send Request | Click "Send Request" button opens dialog | Dialog opens with form | todo |

### 3.3 View Coaching Requests

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|---------------|--------|
| 3.3.1 | View Requests | Athlete views their sent requests page | Lists all requests with status (pending/accepted/declined) | todo |
| 3.3.2 | View Requests | Trainer views received requests | Lists pending requests from athletes | todo |

### 3.4 Handle Coaching Request (Trainer)

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|---------------|--------|
| 3.4.1 | Accept Request | Trainer accepts athlete request | Status changes to "accepted", athlete added to client list | todo |
| 3.4.2 | Decline Request | Trainer declines athlete request | Status changes to "declined" | todo |

### 3.5 Handle Invitation (Athlete)

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|---------------|--------|
| 3.5.1 | Accept Invitation | Athlete accepts trainer invitation | Relationship established, trainer shown in profile | todo |
| 3.5.2 | Decline Invitation | Athlete declines trainer invitation | Invitation removed | todo |

### 3.6 View Assigned Trainer

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|---------------|--------|
| 3.6.1 | View Trainer | Athlete views their assigned trainer | Shows trainer name, contact info | todo |
| 3.6.2 | Navigation | "Browse Trainers" button navigates to trainer list | Navigates to /athlete/trainers | todo |

---

## 4. Workout Tracking (Athlete)

### 4.1 Log Workout

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|---------------|--------|
| 4.1.1 | Log Workout | Create new workout with single exercise | Workout created, appears in history | todo |
| 4.1.2 | Log Workout | Create new workout with multiple exercises | All exercises saved | todo |
| 4.1.3 | Log Workout | Add sets with weight, reps, rest time | Set data saved correctly | todo |
| 4.1.4 | Log Workout | Remove exercise from workout form | Exercise removed | todo |
| 4.1.5 | Log Workout | Click "Add Exercise" button | New exercise card added to form | todo |
| 4.1.6 | Log Workout | Select date and time for workout | Date/time saved correctly | todo |
| 4.1.7 | Log Workout | Submit workout form | Workout saved, success message shown | todo |

### 4.2 Exercise Selector

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|---------------|--------|
| 4.2.1 | Exercise Selector | Search for exercise in dropdown | Filtered results shown | todo |
| 4.2.2 | Exercise Selector | Select exercise from list | Exercise name populated | todo |
| 4.2.3 | Exercise Selector | Enter custom exercise name | Custom name saved | todo |

### 4.3 View Workout History

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|---------------|--------|
| 4.3.1 | View History | View workout list page | Displays chronological list of workouts | todo |
| 4.3.2 | View History | View workout calendar | Calendar view with workout dates highlighted | todo |
| 4.3.3 | View History | Navigate to different months in calendar | Calendar data updates | todo |

### 4.4 Filter Workouts

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|---------------|--------|
| 4.4.1 | Filter | Filter workouts by date range | Only workouts in range displayed | todo |
| 4.4.2 | Filter | Filter workouts by exercise type | Only matching exercises shown | todo |

### 4.5 Edit/Delete Workout

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|---------------|--------|
| 4.5.1 | Edit Workout | Edit workout within 24 hours | Changes saved successfully | todo |
| 4.5.2 | Edit Workout | Edit workout after 24 hours | Error shown "Cannot edit past workouts" | todo |
| 4.5.3 | Delete Workout | Delete workout within 24 hours | Workout removed from list | todo |
| 4.5.4 | Delete Workout | Delete workout after 24 hours | Error shown "Cannot delete past workouts" | todo |

### 4.6 Validation

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|---------------|--------|
| 4.6.1 | Validation | Submit workout without exercise selected | Validation error shown | todo |
| 4.6.2 | Validation | Submit workout with invalid weight value | Validation error shown | todo |

---

## 5. Meal Tracking (Athlete)

### 5.1 Log Meal

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|---------------|--------|
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

### 5.2 View Meal History

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|---------------|--------|
| 5.2.1 | View History | View meal list page | Displays chronological list of meals | todo |
| 5.2.2 | View History | View meal calendar | Calendar view with meal dates highlighted | todo |
| 5.2.3 | View History | Navigate to different months in calendar | Calendar data updates | todo |

### 5.3 Daily Nutrition Summary

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|---------------|--------|
| 5.3.1 | Daily Summary | View daily nutrition summary | Shows total calories and macro breakdown | todo |

### 5.4 Filter Meals

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|---------------|--------|
| 5.4.1 | Filter | Filter meals by date range | Only meals in range displayed | todo |
| 5.4.2 | Filter | Filter meals by meal type | Only matching meals shown | todo |

### 5.5 Edit/Delete Meal

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|---------------|--------|
| 5.5.1 | Edit Meal | Edit existing meal | Changes saved successfully | todo |
| 5.5.2 | Delete Meal | Delete meal | Meal removed from list | todo |

### 5.6 Validation

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|---------------|--------|
| 5.6.1 | Validation | Submit meal without food name | Validation error shown | todo |
| 5.6.2 | Validation | Submit meal with negative calories | Validation error shown | todo |

---

## 6. Trainer Dashboard

### 6.1 Client List

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|---------------|--------|
| 6.1.1 | Client List | Trainer views clients page | Displays list of assigned athletes | todo |
| 6.1.2 | Client Card | View client card | Shows name, email, fitness goals, start date | todo |
| 6.1.3 | Navigation | Click "View Details" on client card | Navigates to client detail page | todo |

### 6.2 Client Details

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|---------------|--------|
| 6.2.1 | Client Workouts | View client's workout history | Lists all workouts | todo |
| 6.2.2 | Client Workouts | Filter client workouts by date range | Only workouts in range displayed | todo |
| 6.2.3 | Client Meals | View client's meal logs | Lists all meals | todo |
| 6.2.4 | Client Meals | Filter client meals by date range | Only meals in range displayed | todo |
| 6.2.5 | Progress Charts | View client progress charts | Charts display workout/nutrition trends | todo |
| 6.2.6 | Overview | View Overview tab | Shows summary of client's progress | todo |

### 6.3 Client Tabs

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|---------------|--------|
| 6.3.1 | Tabs | Switch between Overview/Workouts/Meals/Progress tabs | Correct content displayed | todo |

---

## 7. Comments & Feedback

### 7.1 Add Comment

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|---------------|--------|
| 7.1.1 | Add Comment | Trainer adds comment on workout | Comment saved, visible on workout | todo |
| 7.1.2 | Add Comment | Trainer adds comment on meal | Comment saved, visible on meal | todo |
| 7.1.3 | View Comments | View comment thread on workout | All comments displayed with timestamps | todo |
| 7.1.4 | View Comments | Comment count displayed | Shows "(N)" count | todo |

### 7.2 Reply to Comment

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|---------------|--------|
| 7.2.1 | Reply | Athlete replies to trainer comment | Reply saved as nested comment | todo |
| 7.2.2 | Reply | Trainer replies to athlete response | Reply saved as nested comment | todo |

### 7.3 Edit/Delete Comment

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|---------------|--------|
| 7.3.1 | Edit Comment | Edit own comment | Changes saved | todo |
| 7.3.2 | Delete Comment | Delete own comment | Comment removed | todo |

### 7.4 Threaded View

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|---------------|--------|
| 7.4.1 | Threaded View | View nested comment thread | Replies indented correctly | todo |

---

## 8. Navigation & Routing

### 8.1 Athlete Navigation

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|---------------|--------|
| 8.1.1 | Navigation | Sidebar displays for athlete | Workouts, Meals, Trainers, Requests, Profile shown | todo |
| 8.1.2 | Navigation | Click Workouts in sidebar | Navigates to /athlete/workouts | todo |
| 8.1.3 | Navigation | Click Meals in sidebar | Navigates to /athlete/meals | todo |
| 8.1.4 | Navigation | Click Trainers in sidebar | Navigates to /athlete/trainers | todo |
| 8.1.5 | Navigation | Click Requests in sidebar | Navigates to /athlete/requests | todo |
| 8.1.6 | Navigation | Click Profile in sidebar | Navigates to /profile | todo |

### 8.2 Trainer Navigation

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|---------------|--------|
| 8.2.1 | Navigation | Sidebar displays for trainer | Clients, Requests, Profile shown | todo |
| 8.2.2 | Navigation | Click Clients in sidebar | Navigates to /trainer/clients | todo |
| 8.2.3 | Navigation | Click Requests in sidebar | Navigates to /trainer/requests | todo |
| 8.2.4 | Navigation | Click Profile in sidebar | Navigates to /profile | todo |

### 8.3 Security

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|---------------|--------|
| 8.3.1 | Role Redirect | Athlete tries to access /trainer/* | Redirected to appropriate page | todo |
| 8.3.2 | Role Redirect | Trainer tries to access /athlete/* | Redirected to appropriate page | todo |

---

## 9. Error Handling

### 9.1 API Errors

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|---------------|--------|
| 9.1.1 | API Error | Network connectivity lost | "Network error" message displayed | todo |
| 9.1.2 | API Error | Server returns error | User-friendly error message displayed | todo |

### 9.2 Form Validation

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|---------------|--------|
| 9.2.1 | Validation | Submit with invalid data | Field-level errors displayed | todo |
| 9.2.2 | Loading State | Submit form while loading | Button disabled, loading spinner shown | todo |

### 9.3 Empty States

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|---------------|--------|
| 9.3.1 | Empty State | No workouts logged | "No workouts found" message displayed | todo |
| 9.3.2 | Empty State | No meals logged | "No meals found" message displayed | todo |
| 9.3.3 | Empty State | No clients assigned | "No clients" message displayed | todo |

### 9.4 Loading States

| ID | Feature | Test Scenario | Expected Result | Status |
|----|---------|---------------|----------------|---------------|--------|
| 9.4.1 | Loading | Page loading | Loading spinner displayed | todo |
| 9.4.2 | Loading | Form submitting | Loading indicator on button | todo |

---

## Summary

| Category | Number of Scenarios |
|----------|----------------|
| Authentication | 13 |
| User Profile Management | 6 |
| Trainer-Athlete Relationships | 12 |
| Workout Tracking | 17 |
| Meal Tracking | 14 |
| Trainer Dashboard | 6 |
| Comments & Feedback | 8 |
| Navigation & Routing | 8 |
| Error Handling | 8 |
| **Total** | **92** |

---

*Document generated: 2026-04-24*