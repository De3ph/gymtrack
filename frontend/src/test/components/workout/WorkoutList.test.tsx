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
    delete: vi.fn(),
  },
}))

const mockWorkouts: Workout[] = [
  {
    workoutId: 'w1',
    athleteId: 'a1',
    date: new Date().toISOString(),
    exercises: [
      {
        exerciseId: 'bench-press',
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
    expect(screen.getByText(/set_detail/i)).toBeInTheDocument()
  })

  it('shows empty state when no workouts', () => {
    renderWithProvider(<WorkoutList workouts={[]} />)

    expect(screen.getByText(/no_workouts/i)).toBeInTheDocument()
  })

  it('shows loading state when fetching and no props', () => {
    vi.mocked(workoutApi.getAll).mockImplementation(
      () => new Promise(() => { })
    )
    renderWithProvider(<WorkoutList />)

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('shows edit and delete buttons only for workouts within 24h when not readOnly', () => {
    renderWithProvider(<WorkoutList workouts={[mockWorkouts[0]]} readOnly={false} />)

    expect(screen.getByText(/bench press/i)).toBeInTheDocument()
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThanOrEqual(2)
  })

  it('hides edit and delete buttons but shows comments toggle when readOnly', () => {
    renderWithProvider(<WorkoutList workouts={mockWorkouts} readOnly />)

    expect(screen.getByText(/bench press/i)).toBeInTheDocument()
    const buttons = screen.queryAllByRole('button')
    expect(buttons.length).toBe(1)
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
})
