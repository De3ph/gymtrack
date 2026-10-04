import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WorkoutList } from '@/components/features/workout/WorkoutList'
import { workoutApi } from '@/lib/api'
import type { Workout } from '@/types'

vi.mock('@/lib/api', () => ({
  workoutApi: {
    getAll: vi.fn(),
  },
}))

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
          { weight: 80, weightUnit: 'kg' as const, reps: 12, restTime: 60, completed: false },
          { weight: 80, weightUnit: 'kg' as const, reps: 10, restTime: 60, completed: false },
          { weight: 80, weightUnit: 'kg' as const, reps: 8, restTime: 60, completed: false },
        ],
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

describe('WorkoutList', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
  })

  const renderWithProvider = (ui: React.ReactElement) =>
    render(
      <QueryClientProvider client={queryClient}>
        {ui}
      </QueryClientProvider>
    )

  it('displays workout entries when data is provided via props', () => {
    renderWithProvider(<WorkoutList workouts={mockWorkouts} />)

    expect(screen.getByText(/bench press/i)).toBeInTheDocument()
    expect(screen.getByText(/sets_x/i)).toBeInTheDocument()
    expect(screen.getAllByText(/set_detail/i)).toHaveLength(3)
  })

  it('shows empty state when no workouts', () => {
    renderWithProvider(<WorkoutList workouts={[]} />)

    expect(screen.getByText(/no_workouts/i)).toBeInTheDocument()
  })

  it('shows loading state when fetching and no props', () => {
    vi.mocked(workoutApi.getAll).mockImplementation(
      () => new Promise(() => { })
    )
    const { container } = renderWithProvider(<WorkoutList />)

    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBe(18)
  })

  it('fetches workouts when no props provided', async () => {
    vi.mocked(workoutApi.getAll).mockResolvedValue({ workouts: mockWorkouts, count: mockWorkouts.length })
    renderWithProvider(<WorkoutList />)

    await waitFor(() => {
      expect(workoutApi.getAll).toHaveBeenCalled()
    })
    await waitFor(() => {
      expect(screen.getByText(/bench press/i)).toBeInTheDocument()
    })
  })

  it('collapses and expands a workout card via its header', async () => {
    const user = userEvent.setup()
    renderWithProvider(<WorkoutList workouts={mockWorkouts} />)

    const collapseButton = screen.getByRole('button', { name: /collapse workout/i })
    await user.click(collapseButton)

    await waitFor(() => {
      expect(screen.queryByText(/bench press/i)).not.toBeInTheDocument()
    })
    const expandButton = screen.getByRole('button', { name: /expand workout/i })
    expect(expandButton).toHaveAttribute('aria-expanded', 'false')

    await user.click(expandButton)
    expect(screen.getByText(/bench press/i)).toBeInTheDocument()
  })
})
