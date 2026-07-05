# Product Context: GymTrack

## Why This Project Exists
GymTrack was created to solve the fragmentation in fitness tracking. Existing solutions either focus solely on individual workout logging (like Strong, Hevy) or on coach management (like Trainerize, TrueCoach), but rarely combine both in a unified platform. GymTrack bridges this gap by providing a single platform where athletes log their data and trainers monitor progress — all in one place.

## Problems It Solves

### For Athletes
1. **Disconnected tracking**: Workout logs, meal diaries, and body measurements are often in separate apps. GymTrack unifies them.
2. **No coach visibility**: Athletes working with trainers have no easy way to share progress. GymTrack makes coach oversight seamless.
3. **Trainer discovery**: Finding a personal trainer is ad-hoc. GymTrack's catalog lets athletes browse, review, and request coaching.

### For Trainers
1. **Manual progress tracking**: Trainers resort to spreadsheets, screenshots, or messaging apps. GymTrack gives a structured dashboard.
2. **Client communication overhead**: Sending feedback via WhatsApp/email is fragmented. GymTrack's threaded comment system keeps feedback attached to specific workouts/meals.
3. **Client pipeline management**: No built-in way to manage coaching requests, availability, or reviews. GymTrack handles the full lifecycle.

### For Both
1. **Accountability**: Shared visibility into workout completion, meal adherence, and body changes keeps both parties engaged.
2. **Structured feedback**: Comments are tied to specific exercises or meals, making communication precise and actionable.

## How It Should Work

### User Flows

**Athlete Workflow:**
1. Register as athlete → lands on dashboard
2. Log workouts by selecting predefined exercises, entering sets/reps/weights/rest times
3. Log meals by adding food items with portion sizes and nutritional info
4. Track body measurements (weight, body fat, body part circumferences)
5. Browse trainer catalog → send coaching requests
6. View assigned workout plans from trainer
7. Receive comments from trainer on logged workouts/meals

**Trainer Workflow:**
1. Register as trainer → lands on client list dashboard
2. View client progress overview (workout frequency, meal adherence, body changes)
3. Drill into individual client → view workouts/meals/measurements with tabs
4. Add threaded comments on client workouts and meals
5. Manage profile, availability slots, and respond to reviews
6. Accept/reject coaching requests → creates trainer-athlete relationship
7. Create and assign workout plans to athletes

### UX Principles
- **Fast logging**: Workout logging should take < 2 minutes. Predefined exercises, quick add sets.
- **Calendar + list views**: Dual view for browsing history by date or scrolling through entries.
- **Charts for trends**: Body measurements displayed as charts for progress visualization.
- **Role-appropriate navigation**: Athletes see workout/meal/trainer navigation; trainers see clients/profile.
- **Dark/light theme**: Systemic preference with manual toggle.
- **English + Turkish**: Locale-aware routing with `[locale]` prefix.

## User Experience Goals
1. **Speed**: Athletes can log a workout in under 2 minutes
2. **Clarity**: Trainers get a one-glance dashboard of all client progress
3. **Precision**: Comments are attached to specific workouts/meals, not lost in chat
4. **Discoverability**: Athletes can find trainers by searching the catalog
5. **Consistency**: Dual list/calendar views across workouts, meals, and measurements
6. **Accessibility**: Dark/light theme, i18n support, responsive design