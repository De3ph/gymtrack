---
name: 'AI Agent Coding Guidelines - Fitness Tracker App'
description: 'Comprehensive coding standards and best practices for the Fitness Tracker app, covering frontend (React/Next.js/TypeScript), backend (Go), database (Couchbase), API design, testing, documentation, and code review processes.'
applyTo: '**'
---
# **AI Agent Coding Guidelines - Fitness Tracker App**

## **TABLE OF CONTENTS**
1. [General Principles](#1-general-principles)
2. [Frontend Guidelines (React/Next.js/TypeScript)](#2-frontend-guidelines)
3. [Backend Guidelines (Go)](#3-backend-guidelines)
4. [Database Guidelines (Couchbase)](#4-database-guidelines)
5. [API Design Guidelines](#5-api-design-guidelines)
6. [Testing Guidelines](#6-testing-guidelines)
7. [Documentation Standards](#7-documentation-standards)
8. [Git & Version Control](#8-git--version-control)
9. [Code Review Checklist](#9-code-review-checklist)

---

## **1. GENERAL PRINCIPLES**

### **1.1 Core Values**
```
✓ READABILITY over cleverness
✓ EXPLICIT over implicit
✓ SIMPLE over complex
✓ MAINTAINABLE over optimal (unless performance critical)
✓ SECURE by default
✓ TESTED before deployment
```

### **1.2 Universal Rules**

**RULE 1.2.1: Single Responsibility**
- Every function, component, or class does ONE thing
- If you can't name it clearly, it's doing too much

```typescript
// ❌ BAD: Does too much
function handleUserWorkout(data) {
  validateData(data);
  saveToDatabase(data);
  sendNotification();
  updateUI();
}

// ✅ GOOD: Separated concerns
function validateWorkoutData(data: WorkoutInput): ValidationResult { }
function saveWorkout(data: ValidatedWorkout): Promise<Workout> { }
function notifyTrainer(workoutId: string): Promise<void> { }
```

**RULE 1.2.2: No Magic Numbers/Strings**
```typescript
// ❌ BAD
if (user.role === "trainer" && workouts.length > 50) { }

// ✅ GOOD
const USER_ROLE = {
  TRAINER: 'trainer',
  ATHLETE: 'athlete'
} as const;

const MAX_WORKOUTS_PER_PAGE = 50;

if (user.role === USER_ROLE.TRAINER && workouts.length > MAX_WORKOUTS_PER_PAGE) { }
```

**RULE 1.2.3: Error Handling is Mandatory**
- NEVER use empty catch blocks
- ALWAYS log errors with context
- ALWAYS show user-friendly messages to users

```typescript
// ❌ BAD
try {
  await api.createWorkout(data);
} catch (e) {
  // Silent failure
}

// ✅ GOOD
try {
  await api.createWorkout(data);
  toast.success('Workout logged successfully');
} catch (error) {
  logger.error('Failed to create workout', { error, data });
  toast.error('Unable to save workout. Please try again.');
}
```

**RULE 1.2.4: DRY (Don't Repeat Yourself)**
- If code appears 3+ times, extract it
- Create utilities, hooks, or helper functions

---

## **2. FRONTEND GUIDELINES**

### **2.1 TypeScript Standards**

**RULE 2.1.1: Strict Type Safety**
```typescript
// tsconfig.json MUST include:
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true
}
```

**RULE 2.1.2: Type Everything**
```typescript
// ❌ BAD
const handleSubmit = (data: any) => { }
const users = [];

// ✅ GOOD
interface WorkoutFormData {
  exercise: string;
  weight: number;
  sets: number;
  reps: number[];
}

const handleSubmit = (data: WorkoutFormData): Promise<void> => { }
const users: User[] = [];
```

**RULE 2.1.3: Use Type Inference When Obvious**
```typescript
// ❌ BAD: Over-typing
const count: number = 5;
const name: string = "John";

// ✅ GOOD: Let TypeScript infer
const count = 5;
const name = "John";
const user = await fetchUser(); // Return type is inferred from function
```

**RULE 2.1.4: Define Shared Types**
```typescript
// types/index.ts
export interface User {
  id: string;
  email: string;
  role: 'trainer' | 'athlete';
}

export interface Workout {
  id: string;
  athleteId: string;
  date: Date;
  exercises: Exercise[];
}

export type CreateWorkoutInput = Omit<Workout, 'id'>;
export type UpdateWorkoutInput = Partial<CreateWorkoutInput>;
```

### **2.2 React Component Standards**

**RULE 2.2.1: Component Structure**
```typescript
// components/features/workout/WorkoutCard.tsx

// 1. Imports (grouped)
import { useState } from 'react';
import { format } from 'date-fns';

import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { useWorkouts } from '@/hooks/useWorkouts';
import { formatWeight } from '@/lib/utils/formatting';

import type { Workout } from '@/types';

// 2. Types/Interfaces
interface WorkoutCardProps {
  workout: Workout;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

// 3. Component
export function WorkoutCard({ workout, onEdit, onDelete }: WorkoutCardProps) {
  // 3a. Hooks
  const [isExpanded, setIsExpanded] = useState(false);
  const { deleteWorkout } = useWorkouts();

  // 3b. Derived state
  const formattedDate = format(workout.date, 'PPP');
  const totalVolume = calculateVolume(workout.exercises);

  // 3c. Event handlers
  const handleDelete = async () => {
    if (confirm('Delete this workout?')) {
      await deleteWorkout(workout.id);
      onDelete?.(workout.id);
    }
  };

  // 3d. Early returns
  if (!workout) return null;

  // 3e. Render
  return (
    <Card>
      {/* Component JSX */}
    </Card>
  );
}

// 4. Helper functions (if small and specific to this component)
function calculateVolume(exercises: Exercise[]): number {
  // ...
}
```

**RULE 2.2.2: Component Naming**
```typescript
// ✅ GOOD: PascalCase for components
export function WorkoutForm() { }
export function AthleteList() { }

// ✅ GOOD: Prefix with "use" for hooks
export function useWorkouts() { }
export function useAuth() { }

// ✅ GOOD: Descriptive event handler names
const handleSubmit = () => { }
const handleWorkoutDelete = () => { }
const handleWeightChange = () => { }
```

**RULE 2.2.3: Props Destructuring**
```typescript
// ❌ BAD
function WorkoutCard(props) {
  return <div>{props.workout.name}</div>
}

// ✅ GOOD
function WorkoutCard({ workout, onEdit, className }: WorkoutCardProps) {
  return <div className={className}>{workout.name}</div>
}
```

**RULE 2.2.4: Conditional Rendering**
```typescript
// ❌ BAD: Nested ternaries
return (
  <div>
    {user ? (
      user.role === 'trainer' ? (
        <TrainerDashboard />
      ) : (
        <AthleteDashboard />
      )
    ) : (
      <LoginPage />
    )}
  </div>
);

// ✅ GOOD: Early returns or extracted logic
if (!user) return <LoginPage />;
if (user.role === 'trainer') return <TrainerDashboard />;
return <AthleteDashboard />;
```

**RULE 2.2.5: Component Size Limit**
- Max 200 lines per component file
- Max 10 props per component
- If exceeded, split into smaller components

### **2.3 Custom Hooks Standards**

**RULE 2.3.1: Hook Structure**
```typescript
// hooks/useWorkouts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workoutsApi } from '@/lib/api/workouts';
import type { Workout, CreateWorkoutInput } from '@/types';

interface UseWorkoutsOptions {
  athleteId?: string;
  enabled?: boolean;
}

export function useWorkouts(options: UseWorkoutsOptions = {}) {
  const queryClient = useQueryClient();

  // Queries
  const workoutsQuery = useQuery({
    queryKey: ['workouts', options.athleteId],
    queryFn: () => workoutsApi.getAll(options.athleteId),
    enabled: options.enabled ?? true,
  });

  // Mutations
  const createWorkoutMutation = useMutation({
    mutationFn: (data: CreateWorkoutInput) => workoutsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
    },
  });

  // Return object (alphabetically sorted)
  return {
    createWorkout: createWorkoutMutation.mutate,
    isCreating: createWorkoutMutation.isPending,
    isLoading: workoutsQuery.isLoading,
    workouts: workoutsQuery.data ?? [],
  };
}
```

**RULE 2.3.2: Hook Naming Patterns**
- `use[Feature]` - Main hook (useWorkouts, useAuth)
- `use[Feature]Form` - Form-specific (useWorkoutForm)
- `use[Feature]Filters` - Filter logic (useWorkoutFilters)

### **2.4 State Management**

**RULE 2.4.1: React Query for Server State**
```typescript
// ✅ GOOD: Server state managed by React Query
const { data: workouts, isLoading } = useQuery({
  queryKey: ['workouts', userId],
  queryFn: () => fetchWorkouts(userId),
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

**RULE 2.4.2: Zustand for Client State**
```typescript
// stores/uiStore.ts
import { create } from 'zustand';

interface UiStore {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useUiStore = create<UiStore>((set) => ({
  sidebarOpen: true,
  theme: 'light',
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setTheme: (theme) => set({ theme }),
}));
```

**RULE 2.4.3: useState for Local Component State**
```typescript
// ✅ GOOD: Local UI state
const [isExpanded, setIsExpanded] = useState(false);
const [selectedTab, setSelectedTab] = useState('workouts');
```

### **2.5 Form Handling**

**RULE 2.5.1: Use React Hook Form + Zod**
```typescript
// components/features/workout/WorkoutForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const workoutSchema = z.object({
  exercise: z.string().min(1, 'Exercise name is required'),
  weight: z.number().positive('Weight must be positive'),
  sets: z.number().int().min(1).max(10),
  reps: z.array(z.number().int().min(1)),
  restTime: z.number().int().min(0),
});

type WorkoutFormData = z.infer<typeof workoutSchema>;

export function WorkoutForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<WorkoutFormData>({
    resolver: zodResolver(workoutSchema),
    defaultValues: {
      sets: 3,
      restTime: 60,
    },
  });

  const onSubmit = async (data: WorkoutFormData) => {
    // Handle submission
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  );
}
```

### **2.6 Styling with Tailwind**

**RULE 2.6.1: Organize Classes by Category**
```typescript
// ✅ GOOD: Grouped and readable
<div 
  className={cn(
    // Layout
    "flex flex-col gap-4",
    // Sizing
    "w-full max-w-2xl",
    // Spacing
    "p-6 mx-auto",
    // Appearance
    "bg-white rounded-lg shadow-md",
    // Conditional
    isActive && "border-2 border-primary"
  )}
>
```

**RULE 2.6.2: Use cn() Utility**
```typescript
// lib/utils/cn.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Usage
<Button className={cn("base-classes", props.className)} />
```

**RULE 2.6.3: Extract Repeated Patterns**
```typescript
// ❌ BAD: Repeated classes
<Card className="p-6 bg-white rounded-lg shadow-md" />
<Card className="p-6 bg-white rounded-lg shadow-md" />

// ✅ GOOD: Create reusable component
function WorkoutCard({ children, className }: CardProps) {
  return (
    <Card className={cn("p-6 bg-white rounded-lg shadow-md", className)}>
      {children}
    </Card>
  );
}
```

### **2.7 File Naming & Organization**

**RULE 2.7.1: Naming Conventions**
```
Components:     PascalCase.tsx      (WorkoutCard.tsx)
Hooks:          camelCase.ts        (useWorkouts.ts)
Utils:          camelCase.ts        (formatDate.ts)
Types:          PascalCase.ts       (Workout.ts) or index.ts
Constants:      SCREAMING_SNAKE     (API_ROUTES.ts)
```

**RULE 2.7.2: Folder Structure**
```
app/
  (auth)/
    login/
      page.tsx
  (dashboard)/
    athlete/
      workouts/
        page.tsx
        
components/
  ui/                    # ShadCN components
    button.tsx
    card.tsx
  features/              # Feature-specific components
    workout/
      WorkoutCard.tsx
      WorkoutForm.tsx
      WorkoutList.tsx
    meal/
      MealCard.tsx
  layouts/
    DashboardLayout.tsx
    
hooks/
  useWorkouts.ts
  useMeals.ts
  useAuth.ts
  
lib/
  api/                   # API client functions
    workouts.ts
    meals.ts
  utils/                 # Utility functions
    formatting.ts
    validation.ts
  constants.ts
  
stores/
  authStore.ts
  uiStore.ts
  
types/
  index.ts              # Shared types
  api.ts                # API-specific types
```

---

## **3. BACKEND GUIDELINES (Go)**

### **3.1 Go Conventions**

**RULE 3.1.1: Follow Standard Go Style**
```go
// ✅ GOOD: Standard Go formatting
package handlers

import (
    "net/http"
    
    "github.com/gin-gonic/gin"
    
    "fitness-tracker/internal/domain/models"
    "fitness-tracker/internal/domain/services"
)

// WorkoutHandler handles workout-related HTTP requests
type WorkoutHandler struct {
    workoutService services.WorkoutService
}

// NewWorkoutHandler creates a new workout handler
func NewWorkoutHandler(ws services.WorkoutService) *WorkoutHandler {
    return &WorkoutHandler{
        workoutService: ws,
    }
}
```

**RULE 3.1.2: Error Handling**
```go
// ❌ BAD: Ignored errors
workout, _ := repo.GetByID(id)

// ✅ GOOD: Always handle errors
workout, err := repo.GetByID(id)
if err != nil {
    if errors.Is(err, ErrNotFound) {
        return nil, ErrWorkoutNotFound
    }
    return nil, fmt.Errorf("failed to get workout: %w", err)
}
```

**RULE 3.1.3: Use Custom Error Types**
```go
// internal/domain/errors.go
package domain

import "errors"

var (
    ErrNotFound          = errors.New("resource not found")
    ErrUnauthorized      = errors.New("unauthorized access")
    ErrInvalidInput      = errors.New("invalid input")
    ErrWorkoutNotFound   = errors.New("workout not found")
    ErrAthleteNotFound   = errors.New("athlete not found")
)

// AppError represents an application error with context
type AppError struct {
    Code    string
    Message string
    Err     error
}

func (e *AppError) Error() string {
    if e.Err != nil {
        return fmt.Sprintf("%s: %v", e.Message, e.Err)
    }
    return e.Message
}
```

### **3.2 Project Structure**

**RULE 3.2.1: Layered Architecture**
```
internal/
  api/
    handlers/          # HTTP request handlers
      workout_handler.go
      auth_handler.go
    middleware/        # HTTP middleware
      auth.go
      cors.go
      logging.go
    routes/            # Route definitions
      routes.go
    dto/              # Data Transfer Objects
      workout_dto.go
      
  domain/
    models/           # Domain entities
      workout.go
      user.go
    repositories/     # Data access interfaces
      workout_repository.go
    services/         # Business logic
      workout_service.go
    errors/           # Custom errors
      errors.go
      
  infrastructure/
    database/         # Database connection
      couchbase.go
    repository/       # Repository implementations
      workout_repository_impl.go
      
  config/
    config.go         # Configuration loading
    
  utils/
    validator.go
    jwt.go
```

### **3.3 Repository Pattern**

**RULE 3.3.1: Define Interfaces**
```go
// internal/domain/repositories/workout_repository.go
package repositories

import (
    "context"
    "fitness-tracker/internal/domain/models"
)

type WorkoutRepository interface {
    Create(ctx context.Context, workout *models.Workout) error
    GetByID(ctx context.Context, id string) (*models.Workout, error)
    GetByAthleteID(ctx context.Context, athleteID string, opts QueryOptions) ([]*models.Workout, error)
    Update(ctx context.Context, workout *models.Workout) error
    Delete(ctx context.Context, id string) error
}

type QueryOptions struct {
    StartDate  *time.Time
    EndDate    *time.Time
    Limit      int
    Offset     int
}
```

**RULE 3.3.2: Implement Repositories**
```go
// internal/infrastructure/repository/workout_repository_impl.go
package repository

import (
    "context"
    "fmt"
    
    "github.com/couchbase/gocb/v2"
    
    "fitness-tracker/internal/domain/models"
    "fitness-tracker/internal/domain/repositories"
)

type CouchbaseWorkoutRepository struct {
    bucket *gocb.Bucket
}

func NewCouchbaseWorkoutRepository(bucket *gocb.Bucket) repositories.WorkoutRepository {
    return &CouchbaseWorkoutRepository{bucket: bucket}
}

func (r *CouchbaseWorkoutRepository) Create(ctx context.Context, workout *models.Workout) error {
    collection := r.bucket.DefaultCollection()
    
    _, err := collection.Insert(workout.ID, workout, &gocb.InsertOptions{
        Context: ctx,
    })
    if err != nil {
        return fmt.Errorf("failed to insert workout: %w", err)
    }
    
    return nil
}

// ... other methods
```

### **3.4 Service Layer**

**RULE 3.4.1: Business Logic in Services**
```go
// internal/domain/services/workout_service.go
package services

import (
    "context"
    "fmt"
    "time"
    
    "fitness-tracker/internal/domain/models"
    "fitness-tracker/internal/domain/repositories"
)

type WorkoutService interface {
    CreateWorkout(ctx context.Context, athleteID string, input CreateWorkoutInput) (*models.Workout, error)
    GetWorkout(ctx context.Context, workoutID, userID string) (*models.Workout, error)
    DeleteWorkout(ctx context.Context, workoutID, athleteID string) error
}

type workoutService struct {
    workoutRepo repositories.WorkoutRepository
    userRepo    repositories.UserRepository
}

func NewWorkoutService(wr repositories.WorkoutRepository, ur repositories.UserRepository) WorkoutService {
    return &workoutService{
        workoutRepo: wr,
        userRepo:    ur,
    }
}

func (s *workoutService) CreateWorkout(ctx context.Context, athleteID string, input CreateWorkoutInput) (*models.Workout, error) {
    // Validation
    if err := input.Validate(); err != nil {
        return nil, fmt.Errorf("invalid input: %w", err)
    }
    
    // Check athlete exists
    athlete, err := s.userRepo.GetByID(ctx, athleteID)
    if err != nil {
        return nil, fmt.Errorf("athlete not found: %w", err)
    }
    
    if athlete.Role != models.RoleAthlete {
        return nil, ErrUnauthorized
    }
    
    // Create workout
    workout := &models.Workout{
        ID:        generateID(),
        AthleteID: athleteID,
        Date:      input.Date,
        Exercises: input.Exercises,
        CreatedAt: time.Now(),
    }
    
    if err := s.workoutRepo.Create(ctx, workout); err != nil {
        return nil, fmt.Errorf("failed to create workout: %w", err)
    }
    
    return workout, nil
}
```

### **3.5 HTTP Handlers**

**RULE 3.5.1: Thin Handlers**
```go
// internal/api/handlers/workout_handler.go
package handlers

import (
    "net/http"
    
    "github.com/gin-gonic/gin"
    
    "fitness-tracker/internal/api/dto"
    "fitness-tracker/internal/domain/services"
)

type WorkoutHandler struct {
    workoutService services.WorkoutService
}

func NewWorkoutHandler(ws services.WorkoutService) *WorkoutHandler {
    return &WorkoutHandler{workoutService: ws}
}

// CreateWorkout handles POST /api/workouts
func (h *WorkoutHandler) CreateWorkout(c *gin.Context) {
    // Get user from context (set by auth middleware)
    userID := c.GetString("userID")
    
    // Parse request
    var req dto.CreateWorkoutRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{
            "error": "Invalid request format",
            "details": err.Error(),
        })
        return
    }
    
    // Call service
    workout, err := h.workoutService.CreateWorkout(c.Request.Context(), userID, req.ToInput())
    if err != nil {
        handleError(c, err)
        return
    }
    
    // Return response
    c.JSON(http.StatusCreated, dto.NewWorkoutResponse(workout))
}

// handleError converts service errors to HTTP responses
func handleError(c *gin.Context, err error) {
    switch {
    case errors.Is(err, domain.ErrNotFound):
        c.JSON(http.StatusNotFound, gin.H{"error": "Resource not found"})
    case errors.Is(err, domain.ErrUnauthorized):
        c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
    case errors.Is(err, domain.ErrInvalidInput):
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
    default:
        log.Printf("Internal error: %v", err)
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
    }
}
```

### **3.6 DTOs (Data Transfer Objects)**

**RULE 3.6.1: Separate DTOs from Domain Models**
```go
// internal/api/dto/workout_dto.go
package dto

import (
    "time"
    "fitness-tracker/internal/domain/models"
    "fitness-tracker/internal/domain/services"
)

// CreateWorkoutRequest represents the HTTP request
type CreateWorkoutRequest struct {
    Date      time.Time         `json:"date" binding:"required"`
    Exercises []ExerciseRequest `json:"exercises" binding:"required,min=1"`
}

type ExerciseRequest struct {
    Name       string  `json:"name" binding:"required"`
    Weight     float64 `json:"weight" binding:"required,gt=0"`
    WeightUnit string  `json:"weightUnit" binding:"required,oneof=kg lbs"`
    Sets       int     `json:"sets" binding:"required,min=1,max=10"`
    Reps       []int   `json:"reps" binding:"required,min=1"`
    RestTime   int     `json:"restTime" binding:"min=0"`
}

// ToInput converts DTO to service input
func (r *CreateWorkoutRequest) ToInput() services.CreateWorkoutInput {
    exercises := make([]models.Exercise, len(r.Exercises))
    for i, e := range r.Exercises {
        exercises[i] = models.Exercise{
            Name:       e.Name,
            Weight:     e.Weight,
            WeightUnit: e.WeightUnit,
            Sets:       e.Sets,
            Reps:       e.Reps,
            RestTime:   e.RestTime,
        }
    }
    
    return services.CreateWorkoutInput{
        Date:      r.Date,
        Exercises: exercises,
    }
}

// WorkoutResponse represents the HTTP response
type WorkoutResponse struct {
    ID        string              `json:"id"`
    AthleteID string              `json:"athleteId"`
    Date      time.Time           `json:"date"`
    Exercises []ExerciseResponse  `json:"exercises"`
    CreatedAt time.Time           `json:"createdAt"`
}

func NewWorkoutResponse(w *models.Workout) WorkoutResponse {
    // ... conversion logic
}
```

### **3.7 Validation**

**RULE 3.7.1: Use Struct Tags + Custom Validation**
```go
// internal/domain/models/workout.go
package models

import "errors"

type Workout struct {
    ID        string     `json:"id"`
    AthleteID string     `json:"athleteId" validate:"required,uuid"`
    Date      time.Time  `json:"date" validate:"required"`
    Exercises []Exercise `json:"exercises" validate:"required,min=1,dive"`
}

type Exercise struct {
    Name       string  `json:"name" validate:"required,min=1,max=100"`
    Weight     float64 `json:"weight" validate:"required,gt=0"`
    WeightUnit string  `json:"weightUnit" validate:"required,oneof=kg lbs"`
    Sets       int     `json:"sets" validate:"required,min=1,max=10"`
    Reps       []int   `json:"reps" validate:"required,min=1,dive,min=1"`
    RestTime   int     `json:"restTime" validate:"min=0"`
}

// Validate performs custom business logic validation
func (w *Workout) Validate() error {
    if w.Date.After(time.Now()) {
        return errors.New("workout date cannot be in the future")
    }
    
    for _, ex := range w.Exercises {
        if len(ex.Reps) != ex.Sets {
            return errors.New("number of reps must match number of sets")
        }
    }
    
    return nil
}
```

### **3.8 Middleware**

**RULE 3.8.1: Authentication Middleware**
```go
// internal/api/middleware/auth.go
package middleware

import (
    "net/http"
    "strings"
    
    "github.com/gin-gonic/gin"
    
    "fitness-tracker/internal/utils"
)

func AuthMiddleware(jwtSecret string) gin.HandlerFunc {
    return func(c *gin.Context) {
        // Extract token
        authHeader := c.GetHeader("Authorization")
        if authHeader == "" {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
            c.Abort()
            return
        }
        
        parts := strings.Split(authHeader, " ")
        if len(parts) != 2 || parts[0] != "Bearer" {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization header format"})
            c.Abort()
            return
        }
        
        token := parts[1]
        
        // Validate token
        claims, err := utils.ValidateJWT(token, jwtSecret)
        if err != nil {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
            c.Abort()
            return
        }
        
        // Set user context
        c.Set("userID", claims.UserID)
        c.Set("userRole", claims.Role)
        
        c.Next()
    }
}

// RoleMiddleware checks if user has required role
func RoleMiddleware(allowedRoles ...string) gin.HandlerFunc {
    return func(c *gin.Context) {
        userRole := c.GetString("userRole")
        
        for _, role := range allowedRoles {
            if userRole == role {
                c.Next()
                return
            }
        }
        
        c.JSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions"})
        c.Abort()
    }
}
```

### **3.9 Logging**

**RULE 3.9.1: Structured Logging**
```go
// Use a structured logger like zap or logrus
import "go.uber.org/zap"

logger, _ := zap.NewProduction()
defer logger.Sync()

// ✅ GOOD: Structured logging
logger.Info("Workout created",
    zap.String("workoutID", workout.ID),
    zap.String("athleteID", workout.AthleteID),
    zap.Time("date", workout.Date),
)

logger.Error("Failed to create workout",
    zap.Error(err),
    zap.String("athleteID", athleteID),
)
```

---

## **4. DATABASE GUIDELINES (Couchbase)**

### **4.1 Document Design**

**RULE 4.1.1: Include Type Field**
```json
{
  "type": "workout",
  "workoutId": "uuid-here",
  ...
}
```

**RULE 4.1.2: Use Consistent ID Patterns**
```
user::<uuid>
workout::<uuid>
meal::<uuid>
relationship::<trainerId>::<athleteId>
comment::<targetType>::<targetId>::<uuid>
```

**RULE 4.1.3: Include Timestamps**
```json
{
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T11:00:00Z"
}
```

### **4.2 Indexing**

**RULE 4.2.1: Create Indexes for Common Queries**
```sql
-- Index for getting workouts by athlete
CREATE INDEX idx_workout_athlete 
ON `fitness-tracker`.`_default`.`_default`(athleteId, date DESC) 
WHERE type = 'workout';

-- Index for getting meals by athlete and date
CREATE INDEX idx_meal_athlete_date 
ON `fitness-tracker`.`_default`.`_default`(athleteId, date) 
WHERE type = 'meal';

-- Index for user lookups
CREATE INDEX idx_user_email 
ON `fitness-tracker`.`_default`.`_default`(email) 
WHERE type = 'user';
```

### **4.3 N1QL Queries**

**RULE 4.3.1: Use Parameterized Queries**
```go
// ❌ BAD: SQL injection risk
query := fmt.Sprintf("SELECT * FROM `bucket` WHERE athleteId = '%s'", athleteID)

// ✅ GOOD: Parameterized
query := "SELECT * FROM `bucket` WHERE type = $type AND athleteId = $athleteId"
result, err := cluster.Query(query, &gocb.QueryOptions{
    NamedParameters: map[string]interface{}{
        "type":      "workout",
        "athleteId": athleteID,
    },
})
```

**RULE 4.3.2: Optimize Queries**
```go
// ✅ GOOD: Use indexes, limit results
query := `
    SELECT META().id, workout.* 
    FROM ` + "`fitness-tracker`" + ` AS workout
    WHERE workout.type = $type 
      AND workout.athleteId = $athleteId
      AND workout.date >= $startDate
      AND workout.date <= $endDate
    ORDER BY workout.date DESC
    LIMIT $limit OFFSET $offset
`
```

---

## **5. API DESIGN GUIDELINES**

### **5.1 RESTful Conventions**

**RULE 5.1.1: HTTP Methods**
```
GET    /api/workouts          - List workouts
GET    /api/workouts/:id      - Get specific workout
POST   /api/workouts          - Create workout
PUT    /api/workouts/:id      - Update entire workout
PATCH  /api/workouts/:id      - Partial update
DELETE /api/workouts/:id      - Delete workout
```

**RULE 5.1.2: Response Status Codes**
```
200 OK                  - Successful GET, PUT, PATCH
201 Created             - Successful POST
204 No Content          - Successful DELETE
400 Bad Request         - Invalid input
401 Unauthorized        - Missing/invalid auth token
403 Forbidden           - Insufficient permissions
404 Not Found           - Resource doesn't exist
409 Conflict            - Duplicate resource
422 Unprocessable       - Validation error
500 Internal Error      - Server error
```

**RULE 5.1.3: Consistent Response Format**
```go
// Success response
{
  "data": { ... },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z"
  }
}

// Error response
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid workout data",
    "details": [
      {
        "field": "weight",
        "message": "Weight must be positive"
      }
    ]
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z"
  }
}

// List response
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### **5.2 Versioning**

**RULE 5.2.1: Version in URL**
```
/api/v1/workouts
/api/v1/meals
```

### **5.3 Filtering & Pagination**

**RULE 5.3.1: Query Parameters**
```
GET /api/workouts?athleteId=123&startDate=2024-01-01&endDate=2024-01-31&page=1&limit=20&sort=date:desc
```

---

## **6. TESTING GUIDELINES**

### **6.1 Frontend Testing**

**RULE 6.1.1: Test User Interactions**
```typescript
// __tests__/components/WorkoutForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WorkoutForm } from '@/components/features/workout/WorkoutForm';

describe('WorkoutForm', () => {
  it('should submit valid workout data', async () => {
    const onSubmit = jest.fn();
    render(<WorkoutForm onSubmit={onSubmit} />);
    
    fireEvent.change(screen.getByLabelText('Exercise'), {
      target: { value: 'Bench Press' }
    });
    fireEvent.change(screen.getByLabelText('Weight'), {
      target: { value: '100' }
    });
    
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        exercise: 'Bench Press',
        weight: 100,
        // ...
      });
    });
  });
  
  it('should show validation errors', async () => {
    render(<WorkoutForm />);
    
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    
    expect(await screen.findByText('Exercise name is required')).toBeInTheDocument();
  });
});
```

### **6.2 Backend Testing**

**RULE 6.2.1: Unit Tests for Services**
```go
// internal/domain/services/workout_service_test.go
package services_test

import (
    "context"
    "testing"
    "time"
    
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/mock"
    
    "fitness-tracker/internal/domain/models"
    "fitness-tracker/internal/domain/services"
)

func TestWorkoutService_CreateWorkout(t *testing.T) {
    // Arrange
    mockRepo := new(MockWorkoutRepository)
    mockUserRepo := new(MockUserRepository)
    service := services.NewWorkoutService(mockRepo, mockUserRepo)
    
    athleteID := "athlete-123"
    input := services.CreateWorkoutInput{
        Date: time.Now(),
        Exercises: []models.Exercise{
            {Name: "Squat", Weight: 100, Sets: 3},
        },
    }
    
    mockUserRepo.On("GetByID", mock.Anything, athleteID).Return(&models.User{
        ID:   athleteID,
        Role: models.RoleAthlete,
    }, nil)
    
    mockRepo.On("Create", mock.Anything, mock.AnythingOfType("*models.Workout")).Return(nil)
    
    // Act
    workout, err := service.CreateWorkout(context.Background(), athleteID, input)
    
    // Assert
    assert.NoError(t, err)
    assert.NotNil(t, workout)
    assert.Equal(t, athleteID, workout.AthleteID)
    mockRepo.AssertExpectations(t)
}
```

**RULE 6.2.2: Integration Tests**
```go
// internal/api/handlers/workout_handler_integration_test.go
func TestWorkoutHandler_CreateWorkout_Integration(t *testing.T) {
    // Setup test database
    db := setupTestDB(t)
    defer cleanupTestDB(t, db)
    
    // Create test server
    router := setupTestRouter(db)
    
    // Create test user and get token
    token := createTestUserAndLogin(t, db, "athlete")
    
    // Make request
    body := `{"date": "2024-01-15T10:00:00Z", "exercises": [...]}`
    req := httptest.NewRequest("POST", "/api/workouts", strings.NewReader(body))
    req.Header.Set("Authorization", "Bearer "+token)
    req.Header.Set("Content-Type", "application/json")
    
    w := httptest.NewRecorder()
    router.ServeHTTP(w, req)
    
    // Assert
    assert.Equal(t, http.StatusCreated, w.Code)
    // ... more assertions
}
```

---

## **7. DOCUMENTATION STANDARDS**

### **7.1 Code Comments**

**RULE 7.1.1: Comment "Why", Not "What"**
```go
// ❌ BAD: Comments what the code does (obvious)
// Loop through exercises
for _, ex := range exercises {
    // Add to total
    total += ex.Weight * ex.Sets * ex.Reps
}

// ✅ GOOD: Explains why
// Calculate total workout volume (weight × sets × reps) for progress tracking
for _, ex := range exercises {
    total += ex.Weight * ex.Sets * ex.Reps
}
```

**RULE 7.1.2: Document Complex Logic**
```typescript
/**
 * Calculates the estimated 1RM (one-rep max) using Epley formula.
 * Formula: weight × (1 + reps / 30)
 * 
 * Note: This is most accurate for reps in the 4-6 range.
 * For very high reps (15+), the formula tends to overestimate.
 */
function calculateOneRepMax(weight: number, reps: number): number {
  return weight * (1 + reps / 30);
}
```

**RULE 7.1.3: Document Public APIs**
```go
// WorkoutService handles workout-related business logic
type WorkoutService interface {
    // CreateWorkout creates a new workout for the specified athlete.
    // Returns an error if the athlete doesn't exist or if validation fails.
    CreateWorkout(ctx context.Context, athleteID string, input CreateWorkoutInput) (*models.Workout, error)
    
    // GetWorkout retrieves a workout by ID.
    // Users can only access their own workouts or workouts of their clients.
    // Returns ErrNotFound if workout doesn't exist, ErrUnauthorized if access is denied.
    GetWorkout(ctx context.Context, workoutID, userID string) (*models.Workout, error)
}
```

### **7.2 README Files**

**RULE 7.2.1: Include Setup Instructions**
```markdown
# Fitness Tracker

## Prerequisites
- Node.js 18+
- Go 1.21+
- Couchbase Server 7.x

## Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local with your configuration
npm run dev
```

## Backend Setup
```bash
cd backend
go mod download
cp .env.example .env
# Edit .env with your configuration
go run cmd/server/main.go
```

## Database Setup
1. Install Couchbase
2. Create bucket: `fitness-tracker`
3. Run migrations: `go run cmd/migrate/main.go`
```

---

## **8. GIT & VERSION CONTROL**

### **8.1 Commit Messages**

**RULE 8.1.1: Conventional Commits**
```
feat: add workout deletion feature
fix: resolve incorrect BMI calculation
docs: update API documentation
refactor: extract workout validation logic
test: add tests for meal service
chore: update dependencies
```

**RULE 8.1.2: Detailed Commit Bodies**
```
feat: implement trainer-athlete relationship system

- Add relationship model and repository
- Create invitation flow for trainers
- Add accept/decline endpoints for athletes
- Implement relationship termination

Closes #45
```

### **8.2 Branch Naming**

**RULE 8.2.1: Descriptive Branch Names**
```
feature/workout-tracking
feature/trainer-comments
bugfix/incorrect-weight-conversion
hotfix/auth-token-expiry
refactor/api-error-handling
```

### **8.3 Pull Request Guidelines**

**RULE 8.3.1: PR Template**
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] New feature
- [ ] Bug fix
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots of UI changes

## Checklist
- [ ] Code follows project guidelines
- [ ] Self-reviewed the code
- [ ] Commented complex logic
- [ ] Updated documentation
- [ ] No console errors/warnings
```

---

## **9. CODE REVIEW CHECKLIST**

### **9.1 General**
- [ ] Code follows project structure and naming conventions
- [ ] No hardcoded credentials or sensitive data
- [ ] Error handling is comprehensive
- [ ] Logging is appropriate (no sensitive data in logs)
- [ ] No commented-out code (use git history instead)
- [ ] No console.log or fmt.Println in production code

### **9.2 Frontend**
- [ ] TypeScript types are complete and accurate
- [ ] Components are properly decomposed
- [ ] Props are validated
- [ ] Loading and error states are handled
- [ ] Forms use proper validation
- [ ] No prop drilling (use context/state management)
- [ ] Accessibility attributes (ARIA) are present
- [ ] Mobile responsive

### **9.3 Backend**
- [ ] All errors are properly handled
- [ ] Database queries use indexes
- [ ] N1QL queries are parameterized
- [ ] Authentication/authorization is enforced
- [ ] Input validation is complete
- [ ] DTOs separate from domain models
- [ ] Service layer contains business logic
- [ ] No business logic in handlers

### **9.4 Security**
- [ ] All endpoints require authentication (except auth routes)
- [ ] Authorization checks are present
- [ ] User inputs are validated and sanitized
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (escaped outputs)
- [ ] CSRF protection (if applicable)
- [ ] Rate limiting implemented

### **9.5 Performance**
- [ ] Database queries are optimized
- [ ] Appropriate indexes exist
- [ ] No N+1 query problems
- [ ] Large lists are paginated
- [ ] Images are optimized
- [ ] Bundle size is reasonable

### **9.6 Testing**
- [ ] New features have tests
- [ ] Bug fixes have regression tests
- [ ] Tests are meaningful (not just for coverage)
- [ ] Tests are maintainable

---

## **10. QUICK REFERENCE**

### **Common Patterns**

**Error Handling**
```typescript
// Frontend
try {
  await api.call();
  toast.success('Success');
} catch (error) {
  logger.error('Context', { error });
  toast.error('User-friendly message');
}

// Backend
if err != nil {
  return nil, fmt.Errorf("context: %w", err)
}
```

**API Call with React Query**
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['resource', id],
  queryFn: () => api.fetch(id),
  staleTime: 5 * 60 * 1000,
});
```

**Creating a Service**
```go
type Service interface {
  Method(ctx context.Context, input Input) (*Output, error)
}

type serviceImpl struct {
  repo Repository
}

func NewService(repo Repository) Service {
  return &serviceImpl{repo: repo}
}
```

---