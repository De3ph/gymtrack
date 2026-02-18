import { http, HttpResponse } from 'msw'
import { User, Workout, Meal } from '@/types'

// Mock data
const mockUsers: User[] = [
  {
    userId: 'user-1',
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
    userId: 'user-2',
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
    workoutId: 'workout-1',
    athleteId: 'user-1',
    date: new Date().toISOString(),
    exercises: [
      {
        exerciseId: 'ex-1',
        name: 'Bench Press',
        weight: 80,
        weightUnit: 'kg',
        sets: 3,
        reps: [12, 10, 8],
        restTime: 60
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

const mockMeals: Meal[] = [
  {
    mealId: 'meal-1',
    athleteId: 'user-1',
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
    const body = await request.json() as any
    // Mock successful registration
    return HttpResponse.json({
      user: {
        userId: 'new-user',
        email: body.email,
        role: body.role,
        profile: body.profile
      },
      token: 'mock-jwt-token'
    })
  }),

  http.post('/api/auth/login', async ({ request }) => {
    const body = await request.json() as any
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

  // User endpoints
  http.get('/api/users/me', () => {
    return HttpResponse.json(mockUsers[0])
  }),

  http.put('/api/users/me', async ({ request }) => {
    const body = await request.json() as any
    return HttpResponse.json({
      ...mockUsers[0],
      profile: { ...mockUsers[0].profile, ...body.profile }
    })
  }),

  // Workout endpoints
  http.get('/api/workouts', () => {
    return HttpResponse.json(mockWorkouts)
  }),

  http.post('/api/workouts', async ({ request }) => {
    const body = await request.json() as any
    const newWorkout: Workout = {
      workoutId: 'new-workout',
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    return HttpResponse.json(newWorkout)
  }),

  http.get('/api/workouts/:id', ({ params }) => {
    const workout = mockWorkouts.find(w => w.workoutId === params.id)
    if (!workout) {
      return HttpResponse.json(
        { error: 'Workout not found' },
        { status: 404 }
      )
    }
    return HttpResponse.json(workout)
  }),

  http.put('/api/workouts/:id', async ({ params, request }) => {
    const body = await request.json() as any
    const workout = mockWorkouts.find(w => w.workoutId === params.id)
    if (!workout) {
      return HttpResponse.json(
        { error: 'Workout not found' },
        { status: 404 }
      )
    }
    return HttpResponse.json({
      ...workout,
      ...body,
      updatedAt: new Date().toISOString()
    })
  }),

  http.delete('/api/workouts/:id', ({ params }) => {
    const workout = mockWorkouts.find(w => w.workoutId === params.id)
    if (!workout) {
      return HttpResponse.json(
        { error: 'Workout not found' },
        { status: 404 }
      )
    }
    return HttpResponse.json({ message: 'Workout deleted' })
  }),

  // Meal endpoints
  http.get('/api/meals', () => {
    return HttpResponse.json(mockMeals)
  }),

  http.post('/api/meals', async ({ request }) => {
    const body = await request.json() as any
    const newMeal: Meal = {
      mealId: 'new-meal',
      ...body,
      createdAt: new Date().toISOString()
    }
    return HttpResponse.json(newMeal)
  }),

  http.get('/api/meals/:id', ({ params }) => {
    const meal = mockMeals.find(m => m.mealId === params.id)
    if (!meal) {
      return HttpResponse.json(
        { error: 'Meal not found' },
        { status: 404 }
      )
    }
    return HttpResponse.json(meal)
  }),

  http.put('/api/meals/:id', async ({ params, request }) => {
    const body = await request.json() as any
    const meal = mockMeals.find(m => m.mealId === params.id)
    if (!meal) {
      return HttpResponse.json(
        { error: 'Meal not found' },
        { status: 404 }
      )
    }
    return HttpResponse.json({
      ...meal,
      ...body
    })
  }),

  http.delete('/api/meals/:id', ({ params }) => {
    const meal = mockMeals.find(m => m.mealId === params.id)
    if (!meal) {
      return HttpResponse.json(
        { error: 'Meal not found' },
        { status: 404 }
      )
    }
    return HttpResponse.json({ message: 'Meal deleted' })
  }),

  // Relationship endpoints
  http.post('/api/relationships/invite', () => {
    return HttpResponse.json({
      invitationCode: 'ABC12345',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    })
  }),

  http.post('/api/relationships/accept', async ({ request }) => {
    const body = await request.json() as any
    if (body.code === 'ABC12345') {
      return HttpResponse.json({
        relationshipId: 'rel-1',
        trainerId: 'user-2',
        athleteId: 'user-1',
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
