import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WorkoutForm } from '@/components/features/workout/WorkoutForm'
import type { Workout } from '@/types'

/**
 * Counts the renders of the set rows.
 *
 * The rows are the expensive part of a workout card, so how many of them a
 * change re-renders is the number that matters.
 */
const renders = vi.hoisted(() => ({ setInputs: 0 }))

vi.mock('@/components/features/workout/ExerciseSetInput', () => ({
  ExerciseSetInput: () => {
    renders.setInputs += 1
    return <div data-testid="set-input" />
  },
}))

// The real picker is a client-only dynamic import. Its chunk loading would
// land in the middle of the measurement.
vi.mock('@/components/features/exercise/ExerciseSelector', () => ({
  ExerciseSelector: () => <button type="button">Pick Exercise</button>,
}))

vi.mock('@/lib/api', () => ({
  workoutApi: { create: vi.fn() },
  workoutPlanApi: {
    getAll: vi.fn().mockResolvedValue({ plans: [] }),
    getMyPlans: vi.fn().mockResolvedValue({ plans: [] }),
  },
  exerciseApi: {
    getMuscleGroups: vi.fn().mockResolvedValue([]),
    getEquipment: vi.fn().mockResolvedValue([]),
    search: vi.fn().mockResolvedValue([]),
  },
}))

const workout: Workout = {
  type: 'workout',
  workoutId: 1,
  athleteId: 1,
  date: '2024-01-15T10:00:00.000Z',
  exercises: [
    { exerciseId: 1, name: 'Bench Press', sets: [{ weight: 80, weightUnit: 'kg', reps: 10, restTime: 60 }] },
    { exerciseId: 2, name: 'Squat', sets: [{ weight: 100, weightUnit: 'kg', reps: 5, restTime: 90 }] },
    { exerciseId: 3, name: 'Deadlift', sets: [{ weight: 120, weightUnit: 'kg', reps: 3, restTime: 120 }] },
  ],
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
}

describe('WorkoutForm — re-render scope', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    renders.setInputs = 0
    queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    })
  })

  it('re-renders only the row that was collapsed', async () => {
    const user = userEvent.setup()
    render(
      <QueryClientProvider client={queryClient}>
        <WorkoutForm workout={workout} />
      </QueryClientProvider>,
    )

    // The exercise picker is a client-only dynamic import; wait for it, so
    // its chunk loading does not count as a re-render.
    await screen.findAllByRole(
      'button',
      { name: /pick exercise/i },
      { timeout: 10000 },
    )
    await waitFor(() => {
      expect(screen.getAllByTestId('set-input')).toHaveLength(3)
    })

    const before = renders.setInputs

    const collapseButtons = screen.getAllByRole('button', { name: /collapse exercise/i })
    expect(collapseButtons).toHaveLength(3)
    await user.click(collapseButtons[0])

    // The collapsed row hides its sets and the other two rows are untouched,
    // so no set row is rendered again.
    expect(renders.setInputs).toBe(before)
  })
})
