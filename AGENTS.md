**Fitness Tracker App - AI Development Prompt**

## **Project Overview**

Build a full-stack fitness tracking application that enables personal trainers to monitor and provide feedback on their clients' workouts and nutrition. The app features a two-sided platform connecting trainers with athletes through real-time workout logging, meal tracking, and collaborative feedback.

---

## **1. FUNCTIONAL REQUIREMENTS**

### **1.1 User Management**

* **User Types**: Trainer and Athlete (role-based access control)
* **Authentication**:
  * Email/password registration and login
  * JWT-based session management
  * Secure logout (token invalidation)
  * Password reset functionality
* **User Profiles**:
  * Athletes: name, email, age, weight, height, fitness goals, trainer assignment
  * Trainers: name, email, certifications, specializations, client list

### **1.2 Trainer-Athlete Relationships**

* Trainers can invite athletes via email/unique code
* Athletes can accept/decline trainer invitations
* Athletes can have only ONE active trainer at a time
* Trainers can manage multiple athletes
* Either party can terminate the relationship

### **1.3 Workout Tracking (Athlete)**

* **Log Workouts** with:
  * Date and time
  * Exercise name (searchable dropdown with common exercises + custom entry)
  * Weight (numeric input)
  * Weight unit (kg/lbs toggle)
  * Sets (number)
  * Reps per set (number or array for varied reps)
  * Rest time between sets (seconds/minutes)
  * Optional: duration, intensity, notes
* **View History**: Calendar view + list view of past workouts
* **Edit/Delete**: Own workout entries (within 24 hours of logging)

### **1.4 Meal Tracking (Athlete)**

* **Log Meals** with:
  * Date and meal time (breakfast/lunch/dinner/snack)
  * Food items and quantities
  * Optional: calories, macros (protein/carbs/fats), photos
* **Daily Summary**: Total calories and macro breakdown
* **View History**: Calendar and list views
* **Edit/Delete**: Own meal entries (within 24 hours)

### **1.5 Trainer Oversight Dashboard**

* **Client List**: View all assigned athletes
* **Client Details**: Switch between clients to view:
  * Workout history (filterable by date range, exercise type)
  * Meal logs (filterable by date range, meal type)
  * Progress charts (workout volume, consistency, nutrition trends)
* **Real-time Updates**: See new entries as athletes log them

### **1.6 Communication & Feedback**

* **Comments System**:
  * Trainers can comment on specific workouts or meals
  * Athletes receive notifications for new comments
  * Athletes can reply to trainer comments
  * Threaded conversation view
  * Comment timestamps and edit history
* **Feedback Types**: Positive reinforcement, corrections, suggestions

---

## **2. NON-FUNCTIONAL REQUIREMENTS**

### **2.1 Technology Stack**

#### **Frontend**

```
- Framework: Next.js 14+ (App Router)
- UI Library: React 18
- Styling: Tailwind CSS v3
- Component Library: ShadCN UI with BaseUI
- State Management:
  - Server State: TanStack React Query (v5)
  - Client State: Zustand
- Form Handling: React Hook Form + Zod validation
- Date Handling: date-fns or dayjs
```

#### **Backend**

```
- Language: Go 1.21+
- Framework: Gin or Fiber (lightweight HTTP framework)
- Database: Couchbase Server 7.x
- Authentication: JWT (github.com/golang-jwt/jwt)
- Validation: go-playground/validator
- Environment: godotenv for config
```

### **2.2 Architecture & Design Patterns**

#### **Frontend Structure**

```
/app
  /(auth)
    /login
    /register
  /(dashboard)
    /athlete
      /workouts
      /meals
      /profile
    /trainer
      /clients
      /client/[id]
  /api (Next.js API routes if needed)
/components
  /ui (ShadCN components)
  /features
    /workout
    /meal
    /comments
  /layouts
/hooks (custom React hooks)
/lib
  /api (API client functions)
  /utils
  /validations (Zod schemas)
/stores (Zustand stores)
/types (TypeScript definitions)
```

#### **Backend Structure (Go)**

```
/cmd
  /server (main.go)
/internal
  /api
    /handlers (HTTP handlers)
    /middleware (auth, logging, CORS)
    /routes (route definitions)
  /domain
    /models (data structures)
    /repositories (database layer)
    /services (business logic)
  /config (configuration loading)
  /utils (helpers, validators)
/pkg (reusable packages)
```

#### **Design Patterns to Apply**

* **Frontend**:
  * Custom hooks for reusable logic
  * Component composition pattern
  * Render props for complex components
  * Repository pattern for API calls
* **Backend**:
  * Repository pattern (data access abstraction)
  * Service layer pattern (business logic)
  * Dependency injection
  * Factory pattern for entity creation

### **2.3 Database Schema (Couchbase)**

**Document Types**:

```json
// User Document
{
  "type": "user",
  "userId": "uuid",
  "email": "string",
  "passwordHash": "string",
  "role": "trainer|athlete",
  "profile": {
    "name": "string",
    "age": "number",
    // role-specific fields
  },
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}

// Trainer-Athlete Relationship
{
  "type": "relationship",
  "relationshipId": "uuid",
  "trainerId": "string",
  "athleteId": "string",
  "status": "active|terminated",
  "createdAt": "timestamp"
}

// Workout Entry
{
  "type": "workout",
  "workoutId": "uuid",
  "athleteId": "string",
  "date": "timestamp",
  "exercises": [
    {
      "exerciseId": "uuid",
      "name": "string",
      "weight": "number",
      "weightUnit": "kg|lbs",
      "sets": "number",
      "reps": [12, 10, 8],
      "restTime": "number (seconds)"
    }
  ],
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}

// Meal Entry
{
  "type": "meal",
  "mealId": "uuid",
  "athleteId": "string",
  "date": "timestamp",
  "mealType": "breakfast|lunch|dinner|snack",
  "items": [
    {
      "food": "string",
      "quantity": "string",
      "calories": "number",
      "macros": {
        "protein": "number",
        "carbs": "number",
        "fats": "number"
      }
    }
  ],
  "createdAt": "timestamp"
}

// Comment Document
{
  "type": "comment",
  "commentId": "uuid",
  "targetType": "workout|meal",
  "targetId": "string",
  "authorId": "string",
  "authorRole": "trainer|athlete",
  "content": "string",
  "parentCommentId": "string|null",
  "createdAt": "timestamp",
  "editedAt": "timestamp|null"
}
```

### **2.4 API Specifications**

**Authentication Endpoints**

```
POST   /api/auth/register        - Register new user
POST   /api/auth/login           - Login user (returns JWT)
POST   /api/auth/logout          - Logout user
POST   /api/auth/refresh         - Refresh JWT token
POST   /api/auth/forgot-password - Initiate password reset
```

**User Endpoints**

```
GET    /api/users/me             - Get current user profile
PUT    /api/users/me             - Update current user profile
```

**Relationship Endpoints**

```
POST   /api/relationships/invite - Trainer invites athlete
POST   /api/relationships/accept - Athlete accepts invitation
DELETE /api/relationships/:id    - Terminate relationship
GET    /api/relationships/my-clients - Trainer's client list
GET    /api/relationships/my-trainer - Athlete's trainer info
```

**Workout Endpoints**

```
POST   /api/workouts             - Create workout entry
GET    /api/workouts             - Get workout history (filtered)
GET    /api/workouts/:id         - Get specific workout
PUT    /api/workouts/:id         - Update workout
DELETE /api/workouts/:id         - Delete workout
GET    /api/clients/:id/workouts - Trainer views client workouts
```

**Meal Endpoints**

```
POST   /api/meals                - Create meal entry
GET    /api/meals                - Get meal history
GET    /api/meals/:id            - Get specific meal
PUT    /api/meals/:id            - Update meal
DELETE /api/meals/:id            - Delete meal
GET    /api/clients/:id/meals    - Trainer views client meals
```

**Comment Endpoints**

```
POST   /api/comments             - Add comment
GET    /api/comments?targetId=&targetType= - Get comments for workout/meal
PUT    /api/comments/:id         - Edit comment
DELETE /api/comments/:id         - Delete comment
```

### **2.5 Security & Validation**

* **Authentication**: All endpoints (except auth) require valid JWT
* **Authorization**: Role-based access (trainers can't edit athlete entries, etc.)
* **Input Validation**:
  * Frontend: Zod schemas for all forms
  * Backend: Go validator for all incoming data
* **Sanitization**: Escape user inputs to prevent XSS
* **Rate Limiting**: Limit API calls per user (e.g., 100 requests/minute)
* **HTTPS Only**: Force secure connections in production
* **Password Security**: Bcrypt hashing (cost factor 12)

### **2.6 Code Quality Standards**

* **Clean Code Principles**:
  * Single Responsibility Principle
  * DRY (Don't Repeat Yourself)
  * Meaningful variable/function names
  * Functions < 20 lines ideally
  * Comments for complex logic only
* **Error Handling**:
  * Consistent error response format
  * User-friendly error messages
  * Logging for debugging
* **Testing** (implement later):
  * Unit tests for business logic
  * Integration tests for API endpoints
  * E2E tests for critical user flows
* **Code Formatting**:
  * Frontend: Prettier + ESLint
  * Backend: gofmt + golint