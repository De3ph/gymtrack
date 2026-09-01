# GymTrack Frontend - Feature & Use Case Inventory

**Source**: `frontend/src/` (Next.js 16 App Router, TypeScript, TanStack Query v5, Zustand, shadcn/ui)  
**Purpose**: Reference for mobile app feature parity & improvement planning

---

## 1. Authentication & Session Management

| Feature | Use Case | Description |
|---------|----------|-------------|
| **User Registration** | Athlete/Trainer signs up | Email/password + role selection (athlete/trainer). Returns userId. |
| **User Login** | Athlete/Trainer/Admin signs in | JWT auth. Returns access/refresh tokens + user profile. Tokens in-memory + HttpOnly cookies. |
| **Token Refresh** | Maintain session | Automatic refresh token rotation. Updates memory + cookies. |
| **Session Recovery** | Restore auth on refresh/reopen | `initializeAuth()` reads HttpOnly cookie → decrypts → fetches user from Go backend. |
| **Logout** | Secure sign-out | Invalidates server session, clears tokens, deletes cookies, resets Zustand. |
| **Account Deletion** | Permanently remove account | Requires password confirmation. `DELETE /users/me`. |
| **Account Restore** | Recover deleted account | Login with identifier + password to restore soft-deleted account. |
| **Role-Based Route Guards** | Protect routes by role | Middleware (`proxy.ts`): admin→admin, athlete→athlete, trainer→trainer. Redirects to `/dashboard` on mismatch. |
| **Public Routes** | Access without auth | `/`, `/about`, `/login`, `/register` |

---

## 2. Athlete Dashboard & Core Tracking

### 2.1 Workout Tracking
| Feature | Use Case | Description |
|---------|----------|-------------|
| **Log Workout** | Record training session | Date, multiple exercises (name, weight, unit, sets, reps[], rest time). 24h edit window. |
| **View Workout History** | Browse past workouts | Paginated + date filters. Exercises, volume, calendar view. |
| **Edit Workout** | Modify recent workout | Update within 24 hours. |
| **Delete Workout** | Remove entry | Within 24h window. |
| **Workout Calendar** | Visualize frequency | Monthly calendar with workout indicators, color-coded by volume. |
| **Exercise Selector** | Pick from catalog | Search/filter by muscle group, equipment. |
| **Per-Set Tracking** | Detailed set logging | Weight, reps/set, rest time per exercise. |
| **Workout Stats (Trainer View)** | Trainer sees client stats | Total volume, weekly trends, exercise breakdown, consistency score. |

### 2.2 Meal & Nutrition Tracking
| Feature | Use Case | Description |
|---------|----------|-------------|
| **Log Meal** | Record food intake | Date, mealType (breakfast/lunch/dinner/snack), items (name, calories, macros, quantity). |
| **View Meal History** | Browse past meals | Paginated + date filters. Calendar view. |
| **Edit/Delete Meal** | Modify recent meal | 24h window. |
| **Daily Nutrition Summary** | View daily totals | Aggregated calories, protein, carbs, fats. Meal-type breakdown. |
| **Trainer Meal View** | Monitor client nutrition | Read-only via `/clients/:id/meals`. |

### 2.3 Body Measurements
| Feature | Use Case | Description |
|---------|----------|-------------|
| **Log Measurement** | Record body stats | Weight, bodyFat%, 16 parts (chest, waist, hips, neck, shoulders, biceps L/R, forearms L/R, thighs L/R, calves L/R), notes. |
| **View History** | Track progress | Paginated + date filters. |
| **Latest Measurement** | Current stats | `GET /measurements/latest` for dashboard. |
| **Edit/Delete** | Update recent | 24h window. |
| **Trainer View** | Monitor progress | Read-only via `/clients/:username/measurements`. |

---

## 3. Trainer-Athlete Relationship Management

| Feature | Use Case | Description |
|---------|----------|-------------|
| **Generate Invitation Code** | Trainer creates invite | Time-limited code. Returns code + expiry. |
| **Accept Invitation** | Athlete joins trainer | Enter code → creates `Relationship` (active). |
| **View My Trainer** | Athlete sees trainer | Active trainer + pending invitations. |
| **View My Clients** | Trainer sees athletes | List with details, status, stats summary. |
| **Client Detail View** | Deep-dive one athlete | Workouts, meals, measurements tabs + progress charts. |
| **Client Stats** | Aggregated metrics | Workout volume, nutrition averages, measurement trends, consistency. |
| **Terminate Relationship** | End coaching | Either party. Sets status `terminated`. |
| **Coaching Requests (Athlete→Trainer)** | Request coaching | Send message. Status: pending/accepted/rejected. |
| **Coaching Requests (Trainer View)** | Manage requests | List pending. Accept→creates relationship. Reject→closes. |

---

## 4. Trainer Profile & Public Catalog

| Feature | Use Case | Description |
|---------|----------|-------------|
| **Public Trainer Search** | Browse trainers | Filter: specialization, location, minRating, availability. Paginated. |
| **Trainer Public Profile** | View details | Bio, hourly rate, availability, reviews, avg rating, review count. |
| **Trainer Profile Mgmt** | Edit own profile | Bio, hourlyRate, isAvailable, specializations, certifications. |
| **Availability Mgmt** | Set weekly schedule | Recurring slots: dayOfWeek (0-6), startTime, endTime. Public + private views. |
| **Trainer Reviews** | Rate trainers | 1-5 stars + comment. CRUD by author. |
| **Trainer Dashboard** | Overview | Active clients, pending requests, upcoming sessions. |

---

## 5. Workout Plans (Templates)

| Feature | Use Case | Description |
|---------|----------|-------------|
| **Create Workout Plan** | Build template | Name, description, ordered exercises (sets: weight, reps, restTime). |
| **List My Plans** | Manage templates | View all with exercise counts. |
| **View Plan Detail** | Inspect structure | Expandable exercise list with set details. |
| **Edit/Delete Plan** | Modify/remove template | Soft delete. |
| **Assign Plan** | Distribute to athletes | Select athleteIds → creates `WorkoutPlanAssignment` with dates. |
| **View Assignments** | Track distribution | List per plan with status. |
| **Athlete: View Assigned** | See trainer's plans | Read-only list with details. |
| **Start Workout from Plan** | Log from template | `POST /workout-plans/:id/start` → creates Workout pre-filled. |

---

## 6. Comments & Communication

| Feature | Use Case | Description |
|---------|----------|-------------|
| **Add Comment** | Comment on workout/meal | Threaded on `workout`/`meal`. Max 2000 chars. |
| **View Thread** | Read discussion | Nested replies, author, timestamps. |
| **Edit/Delete Comment** | Manage own comments | Author-only (admin can delete any). |
| **Admin Moderation** | Manage all comments | Filter by targetType, paginated, delete any. |

---

## 7. Exercise Catalog (Reference Data)

| Feature | Use Case | Description |
|---------|----------|-------------|
| **Browse Exercises** | Search library | Filter: muscle group, equipment, text. Paginated. |
| **Exercise Detail** | View info | Name, muscle group, equipment, instructions. |
| **Muscle Groups List** | Reference for filtering | All groups (chest, back, legs, etc.). |
| **Equipment List** | Reference for filtering | All types (barbell, dumbbell, machine, bodyweight, etc.). |
| **Create Custom Exercise** | Add personal entries | Authenticated users. |
| **Update/Delete Custom** | Manage own | Only user-created. |

---

## 8. Admin Panel

| Feature | Use Case | Description |
|---------|----------|-------------|
| **Dashboard Stats** | System overview | Total users, active relationships, workouts/meals logged, revenue. |
| **User Management** | List all users | Paginated, filterable by role, status, search. |
| **View User Detail** | Inspect user | Profile, role, status, created dates. |
| **Change User Role** | Promote/demote | athlete ↔ trainer ↔ admin. |
| **Change User Status** | Activate/suspend/ban | active, suspended, banned. |
| **Admin Profile** | Self-management | Change own password. |
| **Comment Moderation** | Review all comments | Filter by targetType, paginated, delete any. |

---

## 9. Profile & Settings (All Roles)

| Feature | Use Case | Description |
|---------|----------|-------------|
| **View Profile** | See account info | Email, role, profile JSON (name, avatar, preferences). |
| **Update Profile** | Edit name, avatar, prefs | Partial updates to profile JSONB. |
| **Change Password** | Update credentials | Old + new validation. |
| **Locale Switcher** | EN/TR toggle | Persisted in cookie, updates next-intl routing. |
| **Theme Toggle** | Light/dark/system | Persisted in localStorage, Tailwind CSS v4. |

---

## 10. Technical Infrastructure (Mobile Parity)

| Area | Implementation | Mobile Considerations |
|------|---------------|----------------------|
| **API Client** | `api-client.ts` with Bearer token auto-attach | Same client works; timeout config (30s default). |
| **Auth State** | Zustand (`authStore`) + HttpOnly cookies | Mobile: secure storage (Keychain/Keystore) + cookie equivalent. |
| **Session Recovery** | `GET /api/auth/session` decrypts cookie → restores tokens | Mobile: silent refresh on app foreground. |
| **React Query** | v5: 5min staleTime, 10min gcTime, retry: 1 | Same caching; configure for offline-first. |
| **i18n** | next-intl with `[locale]`, `messages/*.json` | Bundle translations or fetch remotely. |
| **Validation** | Zod schemas in `lib/validations/*.ts` | Reuse for mobile form validation. |
| **Routes** | Centralized in `lib/routes.ts` | Map to mobile deep links/navigation. |
| **Error Handling** | Normalized errors in `api-client.ts` | Consistent shapes for mobile UI. |
| **Date/Time** | `lib/utils/datetime.ts` utilities | Same formatting/parsing logic. |
| **Sentry** | `@sentry/nextjs` | Add Sentry mobile SDK with same DSN. |

---

## 11. Role-Based Route Map

| Role | Routes | Key Pages |
|------|--------|-----------|
| **Public** | `/`, `/about`, `/login`, `/register` | Landing, Auth |
| **Athlete** | `/athlete/workouts`, `/meals`, `/measurements`, `/trainers`, `/trainers/[id]`, `/my-trainer/[id]`, `/requests`, `/workout-plans` | Dashboard, Tracking, Trainer Browse, Plans |
| **Trainer** | `/trainer/clients`, `/client/[username]`, `/profile`, `/requests`, `/workout-plans`, `/workout-plans/[id]` | Client Mgmt, Profile, Plans |
| **Admin** | `/admin`, `/admin/users`, `/admin/users/[id]`, `/admin/profile`, `/admin/moderation` | Stats, User Mgmt, Moderation |
| **Shared** | `/dashboard`, `/profile` | Role-agnostic landing, Settings |

---

## 12. API Endpoint Summary

| Domain | Key Endpoints |
|--------|---------------|
| Auth | `POST /auth/{register,login,refresh,logout,restore}`, `GET/DELETE /api/auth/session` |
| Users | `GET/PUT/DELETE /users/me`, `PUT /admin/profile/password` |
| Workouts | `POST/GET /workouts`, `GET/PUT/DELETE /workouts/:id`, `GET /clients/:id/workouts` |
| Meals | `POST/GET /meals`, `GET/PUT/DELETE /meals/:id`, `GET /meals?date=`, `GET /clients/:id/meals` |
| Measurements | `POST/GET /measurements`, `GET /measurements/latest`, `GET/PUT/DELETE /measurements/:id`, `GET /clients/:username/measurements` |
| Relationships | `POST /relationships/{invite,accept}`, `DELETE /relationships/:id`, `GET /relationships/{my-clients,my-trainer,client/:id,client/:id/stats}` |
| Comments | `POST/GET /comments`, `PUT/DELETE /comments/:id` |
| Trainer Catalog | `GET /trainers`, `GET/PUT /trainers/me/profile`, `GET/PUT/DELETE /trainers/me/availability`, `POST/GET /trainers/:id/reviews` |
| Coaching Requests | `POST /coaching-requests`, `GET /coaching-requests/{my,pending}`, `PUT /coaching-requests/:id/{accept,reject}` |
| Exercises | `GET /exercises`, `/muscle-groups`, `/equipment`, `GET/POST/PUT/DELETE /exercises/:id` |
| Workout Plans | `POST/GET /workout-plans`, `GET/PUT/DELETE /workout-plans/:id`, `POST /workout-plans/:id/assign`, `GET /workout-plans/assigned`, `POST /workout-plans/:id/start` |
| Admin | `GET /admin/stats`, `GET/PUT /admin/users`, `PUT /admin/users/:id/{role,status}`, `GET/DELETE /admin/comments` |

---

## 13. Mobile App Feature Parity Checklist

### Must-Have (Core Tracking)
- [ ] Workout logging (exercises, sets, reps, weight, rest)
- [ ] Meal logging (meal types, food items, macros)
- [ ] Body measurements (weight, body fat, 16 body parts)
- [ ] Offline-first sync (queue mutations, sync on reconnect)
- [ ] Auth: login, register, token refresh, biometric unlock
- [ ] Role-based navigation (athlete/trainer tabs)

### Should-Have (Relationship Features)
- [ ] Trainer search & profile view
- [ ] Invitation code flow (generate/accept)
- [ ] Coaching requests (send/accept/reject)
- [ ] Client list & detail view (trainer)
- [ ] Progress charts (volume, nutrition, measurements)

### Nice-to-Have (Advanced)
- [ ] Workout plans (create, assign, start from template)
- [ ] Comments on workouts/meals
- [ ] Exercise catalog search
- [ ] Trainer availability calendar
- [ ] Reviews & ratings
- [ ] Push notifications (reminders, messages)
- [ ] Data export (CSV/PDF reports)
- [ ] Apple Health / Google Fit integration

---

## 14. Key Data Models (Mobile DTOs)

```typescript
interface Workout { workoutId, athleteId, date, exercises: WorkoutExercise[], createdAt, updatedAt }
interface WorkoutExercise { exerciseId?, name, weight, weightUnit, sets, reps: number[], restTime }
interface Meal { mealId, athleteId, date, mealType, items: FoodItem[], createdAt, updatedAt }
interface FoodItem { name, calories, protein, carbs, fats, quantity, unit }
interface BodyMeasurement { measurementId, athleteId, date, weight, bodyFatPct, parts: BodyPart[], notes }
interface Relationship { relationshipId, trainerId, athleteId, status, createdAt }
interface TrainerProfile { userId, bio, hourlyRate, isAvailable, specializations, certifications }
interface WorkoutPlan { planId, creatorId, name, description, exercises: PlanExercise[], status }
interface Comment { commentId, targetType, targetId, authorId, content, parentCommentId, createdAt, editedAt }
```

---

## 15. Suggested Mobile Architecture

| Layer | Recommendation |
|-------|----------------|
| **Framework** | React Native (Expo) or Flutter |
| **State** | TanStack Query (RN) or Riverpod (Flutter) + Secure Storage |
| **Auth** | Expo SecureStore / Flutter SecureStorage + HttpOnly cookie equivalent |
| **API** | Shared TS types + generated client (openapi-typescript-codegen) |
| **Offline** | WatermelonDB (RN) / Drift (Flutter) + background sync queue |
| **Navigation** | Expo Router / go_router with deep linking |
| **Charts** | react-native-svg-charts / fl_chart |
| **Calendar** | react-native-calendars / table_calendar |
| **Forms** | React Hook Form + Zod / flutter_form_builder |

---

*Backend API contracts (Swagger) are the source of truth — verify at `/swagger` before mobile implementation.*