import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WorkoutPlanForm } from '@/components/features/workout-plan/WorkoutPlanForm'
import { workoutPlanApi } from '@/lib/api'
import type { WorkoutPlan } from '@/types'

vi.mock('@/lib/api', () => ({
  workoutPlanApi: {
    create: vi.fn(),
    update: vi.fn(),
  },
}))

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
      sets: [
        { weight: 40, weightUnit: 'kg', reps: 8, restTime: 90, setType: 'working' },
        { weight: 50, weightUnit: 'kg', reps: 5, restTime: 120, setType: 'working' },
      ],
      order: 0,
    },
  ],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const renderForm = (p = plan) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <WorkoutPlanForm plan={p} />
    </QueryClientProvider>,
  )
}

describe('WorkoutPlanForm - set type persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(workoutPlanApi.update).mockResolvedValue(plan)
  })

  it('keeps an existing non-working set type from the plan', async () => {
    const warmed: WorkoutPlan = {
      ...plan,
      exercises: [
        {
          ...plan.exercises[0],
          sets: [
            { ...plan.exercises[0].sets[0], setType: 'warmup' },
            plan.exercises[0].sets[1],
          ],
        },
      ],
    }
    const user = userEvent.setup()
    renderForm(warmed)

    const combos = screen.getAllByRole('combobox')
    expect(combos[0]).toHaveTextContent('Warm-up')

    await user.click(screen.getByRole('button', { name: /update plan/i }))

    await waitFor(() => expect(workoutPlanApi.update).toHaveBeenCalled())
    const payload = vi.mocked(workoutPlanApi.update).mock.calls.at(-1)?.[1] as {
      exercises: { sets: { setType?: string }[] }[]
    }
    expect(payload.exercises[0].sets[0].setType).toBe('warmup')
    expect(payload.exercises[0].sets[1].setType).toBe('working')
  })

  it('sends the newly selected set type when changed in the editor', async () => {
    const user = userEvent.setup()
    renderForm(plan)

    const combos = screen.getAllByRole('combobox')
    expect(combos).toHaveLength(2)
    await user.click(combos[1])
    await user.click(screen.getByRole('option', { name: 'Drop' }))

    await user.click(screen.getByRole('button', { name: /update plan/i }))

    await waitFor(() => expect(workoutPlanApi.update).toHaveBeenCalled())
    const payload = vi.mocked(workoutPlanApi.update).mock.calls.at(-1)?.[1] as {
      exercises: { sets: { setType?: string }[] }[]
    }
    expect(payload.exercises[0].sets[0].setType).toBe('working')
    expect(payload.exercises[0].sets[1].setType).toBe('drop')
  })
})