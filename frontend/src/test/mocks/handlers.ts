import { http, HttpResponse } from 'msw'
import {
  User,
  Workout,
  Meal,
  WorkoutExercise,
  UserRole,
  UserProfile,
  MealType,
  FoodItem,
} from '@/types'

// Request body shapes for mocked endpoints
interface RegisterRequestBody {
  email: string
  role: UserRole
  profile: Partial<UserProfile>
}

interface LoginRequestBody {
  email: string
  password: string
}

interface UpdateProfileRequestBody {
  profile: Partial<UserProfile>
}

interface PasswordRequestBody {
  password: string
}

interface RestoreRequestBody {
  identifier: string
  password: string
}

interface WorkoutRequestBody {
  date: string
  exercises: WorkoutExercise[]
}

interface MealRequestBody {
  date: string
  mealType: MealType
  items: FoodItem[]
}

interface AcceptInvitationRequestBody {
  code: string
}

// Mock data

/**
 * Passwords the account-management handlers accept. Exported so the tests that
 * exercise the happy path can send the same literal instead of duplicating it,
 * and so the failure branches stay reachable with any other value.
 */
export const DELETE_ACCOUNT_PASSWORD = 'correct123'
export const RESTORE_PASSWORD = 'correct123'

const mockUsers: User[] = [
  {
    userId: 1,
    username: 'testathlete',
    email: 'athlete@test.com',
    role: 'athlete',
    profile: {
      name: 'Test Athlete',
      age: 25,
      weight: 70,
      height: 175,
      fitnessGoals: 'Build muscle, Increase endurance'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    userId: 2,
    username: 'testtrainer',
    email: 'trainer@test.com',
    role: 'trainer',
    profile: {
      name: 'Test Trainer',
      certifications: 'CPT',
      specializations: 'Strength training, Cardio'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

const mockWorkouts: Workout[] = [
  {
    type: 'workout',
    workoutId: 1,
    athleteId: 1,
    date: new Date().toISOString(),
    exercises: [
      {
        exerciseId: 1,
        name: 'Bench Press',
        sets: [
          { weight: 80, weightUnit: 'kg', reps: 12 },
          { weight: 80, weightUnit: 'kg', reps: 10 },
          { weight: 80, weightUnit: 'kg', reps: 8 }
        ],
        notes: 'Rest 60 seconds between sets'
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

const mockMeals: Meal[] = [
  {
    mealId: 1,
    athleteId: 1,
    date: new Date().toISOString(),
    mealType: 'breakfast',
    items: [
      {
        food: 'Oatmeal',
        quantity: '1 cup',
        calories: 150,
        macros: {
          protein: 5,
          carbs: 27,
          fats: 3
        }
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

// API handlers
export const handlers = [
  // Auth endpoints
  http.post('/api/auth/register', async ({ request }) => {
    const body = await request.json() as RegisterRequestBody
    // Mock successful registration
    return HttpResponse.json({
      user: {
        userId: 3,
        email: body.email,
        role: body.role,
        profile: body.profile
      },
      token: 'mock-jwt-token'
    })
  }),

  http.post('/api/auth/login', async ({ request }) => {
    const body = await request.json() as LoginRequestBody
    const user = mockUsers.find(u => u.email === body.email)

    if (!user) {
      return HttpResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    return HttpResponse.json({
      user,
      token: 'mock-jwt-token'
    })
  }),

  http.post('/api/auth/logout', () => {
    return HttpResponse.json({ message: 'Logged out successfully' })
  }),

  // Restoring a soft-deleted account. Only the exact password below succeeds, so
  // the expired-window branch stays reachable without extra setup.
  http.post('/api/auth/restore', async ({ request }) => {
    const body = await request.json() as RestoreRequestBody

    if (body.password !== RESTORE_PASSWORD) {
      return HttpResponse.json(
        { error: 'Invalid credentials or restore period expired' },
        { status: 401 }
      )
    }

    return HttpResponse.json({
      user: {
        userId: 4,
        email: body.identifier,
        role: 'athlete',
        profile: {}
      },
      accessToken: 'restored-access-token',
      refreshToken: 'restored-refresh-token',
      token: 'restored-access-token'
    })
  }),

  // User endpoints
  http.get('/api/users/me', () => {
    return HttpResponse.json(mockUsers[0])
  }),

  http.put('/api/users/me', async ({ request }) => {
    const body = await request.json() as UpdateProfileRequestBody
    return HttpResponse.json({
      ...mockUsers[0],
      profile: { ...mockUsers[0].profile, ...body.profile }
    })
  }),

  // Soft delete. The account is scheduled for removal, not removed outright, so
  // the success path is a message rather than a 204.
  http.delete('/api/users/me', async ({ request }) => {
    const body = await request.json() as PasswordRequestBody

    if (body.password !== DELETE_ACCOUNT_PASSWORD) {
      return HttpResponse.json(
        { error: 'invalid password' },
        { status: 401 }
      )
    }

    return HttpResponse.json({ message: 'Account deleted successfully' })
  }),

  // Workout endpoints
  http.get('/api/workouts', () => {
    return HttpResponse.json(mockWorkouts)
  }),

  http.post('/api/workouts', async ({ request }) => {
    const body = await request.json() as WorkoutRequestBody
    const newWorkout: Workout = {
      workoutId: 3,
      athleteId: 1,
      type: 'workout',
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    return HttpResponse.json(newWorkout)
  }),

  http.get('/api/workouts/:id', ({ params }) => {
    const workout = mockWorkouts.find(w => w.workoutId === Number(params.id))
    if (!workout) {
      return HttpResponse.json(
        { error: 'Workout not found' },
        { status: 404 }
      )
    }
    return HttpResponse.json(workout)
  }),

  // Meal endpoints
  http.get('/api/meals', () => {
    return HttpResponse.json(mockMeals)
  }),

  http.post('/api/meals', async ({ request }) => {
    const body = await request.json() as MealRequestBody
    const newMeal: Meal = {
      mealId: 3,
      athleteId: 1,
      ...body,
      createdAt: new Date().toISOString()
    }
    return HttpResponse.json(newMeal)
  }),

  http.get('/api/meals/:id', ({ params }) => {
    const meal = mockMeals.find(m => m.mealId === Number(params.id))
    if (!meal) {
      return HttpResponse.json(
        { error: 'Meal not found' },
        { status: 404 }
      )
    }
    return HttpResponse.json(meal)
  }),

  // Relationship endpoints
  http.post('/api/relationships/invite', () => {
    return HttpResponse.json({
      invitationCode: 'ABC12345',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    })
  }),

  http.post('/api/relationships/accept', async ({ request }) => {
    const body = await request.json() as AcceptInvitationRequestBody
    if (body.code === 'ABC12345') {
      return HttpResponse.json({
        relationshipId: 1,
        trainerId: 2,
        athleteId: 1,
        status: 'active',
        createdAt: new Date().toISOString()
      })
    }
    return HttpResponse.json(
      { error: 'Invalid invitation code' },
      { status: 400 }
    )
  })
]
