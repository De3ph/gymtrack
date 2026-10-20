import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AddExerciseToPlanDialog } from '@/components/features/workout-plan/AddExerciseToPlanDialog'
import { workoutPlanApi } from '@/lib/api'
import type { WorkoutPlan } from '@/types'

vi.mock('@/lib/api', () => ({
  workoutPlanApi: {
    getAll: vi.fn(),
    getById: vi.fn(),
    update: vi.fn(),
  },
}))

// The cache-busting server action calls next/cache's updateTag, which only
// works inside a request scope. The dialog only calls it after a successful
// write, so it is stubbed out here.
vi.mock('@/lib/actions/cache', () => ({
  revalidateWorkoutPlansCache: vi.fn().mockResolvedValue(undefined),
}))

const plan: WorkoutPlan = {
  planId: 11,
  creatorId: 1,
  name: 'Push Day',
  description: 'Chest and shoulders',
  exercises: [
    {
      exerciseId: 3,
      name: 'Overhead Press',
      sets: [{ weight: 40, weightUnit: 'kg', reps: 8, restTime: 90 }],
      order: 0,
    },
  ],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const exercise = { exerciseId: 7, name: 'Bench Press' }

describe('AddExerciseToPlanDialog', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    })
    vi.mocked(workoutPlanApi.getAll).mockResolvedValue({ plans: [plan], count: 1 })
    vi.mocked(workoutPlanApi.getById).mockResolvedValue(plan)
    vi.mocked(workoutPlanApi.update).mockResolvedValue(plan)
  })

  const renderDialog = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <AddExerciseToPlanDialog
          exercise={exercise}
          open
          onOpenChange={() => {}}
          createPlanHref="/trainer/workout-plans"
        />
      </QueryClientProvider>,
    )

  it('lists the plans the user owns so one can be picked', async () => {
    renderDialog()

    expect(await screen.findByRole('radio', { name: /push day/i })).toBeInTheDocument()
  })

  it('moves on to the set inputs once a plan is selected', async () => {
    const user = userEvent.setup()
    renderDialog()

    const radio = await screen.findByRole('radio', { name: /push day/i })
    await user.click(radio)
    await user.click(screen.getByRole('button', { name: /^next$/i }))

    // The set editor is the second step; its inputs are the proof it is
    // reachable, and the chosen plan is still named above it.
    expect(await screen.findByLabelText(/reps/i)).toBeInTheDocument()
    expect(screen.getByText(/push day/i)).toBeInTheDocument()
  })

  it('appends the exercise to the chosen plan and writes it back', async () => {
    const user = userEvent.setup()
    renderDialog()

    const radio = await screen.findByRole('radio', { name: /push day/i })
    await user.click(radio)
    await user.click(screen.getByRole('button', { name: /^next$/i }))

    const reps = await screen.findByLabelText(/reps/i)
    await user.clear(reps)
    await user.type(reps, '5')

    await user.click(screen.getByRole('button', { name: /add to plan/i }))

    await waitFor(() => {
      expect(workoutPlanApi.update).toHaveBeenCalled()
    })

    const [planId, payload] = vi.mocked(workoutPlanApi.update).mock.calls[0]
    expect(planId).toBe(plan.planId)
    // The exercise is appended after the ones already in the plan, and it
    // carries the sets the user just configured.
    expect(payload.exercises).toHaveLength(2)
    expect(payload.exercises[1]).toMatchObject({
      exerciseId: exercise.exerciseId,
      name: exercise.name,
      order: 1,
      sets: [expect.objectContaining({ reps: 5 })],
    })
    // The pre-existing exercise survives the write untouched.
    expect(payload.exercises[0].name).toBe('Overhead Press')
  })

  it('never writes a set of zero reps', async () => {
    const user = userEvent.setup()
    renderDialog()

    const radio = await screen.findByRole('radio', { name: /push day/i })
    await user.click(radio)
    await user.click(screen.getByRole('button', { name: /^next$/i }))

    const reps = await screen.findByLabelText(/reps/i)
    await user.clear(reps)
    await user.type(reps, '0')

    await user.click(screen.getByRole('button', { name: /add to plan/i }))

    await waitFor(() => {
      expect(workoutPlanApi.update).toHaveBeenCalled()
    })

    const [, payload] = vi.mocked(workoutPlanApi.update).mock.calls[0]
    // The backend stores the reps as they arrive, so a set of zero reps has
    // to be clamped before it is written.
    expect(payload.exercises[1].sets[0].reps).toBe(1)
  })

  it('offers a way to create a plan when the user has none', async () => {
    vi.mocked(workoutPlanApi.getAll).mockResolvedValue({ plans: [], count: 0 })
    renderDialog()

    expect(await screen.findByRole('link', { name: /create a plan/i })).toBeInTheDocument()
  })
})
