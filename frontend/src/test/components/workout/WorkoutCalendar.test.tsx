import { render, screen, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WorkoutCalendar } from '@/components/features/workout/WorkoutCalendar'
import { workoutApi } from '@/lib/api'
import { useCalendarStore } from '@/stores/calendar-store'
import type { Workout } from '@/types'

vi.mock('@/lib/api', () => ({
  workoutApi: {
    getAll: vi.fn(),
  },
}))

const baseDate = new Date()
baseDate.setHours(10, 0, 0, 0)
const mockWorkouts: Workout[] = [
  {
    type: 'workout',
    workoutId: 1,
    athleteId: 1,
    date: baseDate.toISOString(),
    exercises: [
      {
        exerciseId: 1,
        name: 'Squats',
        sets: [
          { weight: 100, weightUnit: 'kg' as const, reps: 10, restTime: 90, completed: false },
        ],
      },
    ],
    createdAt: baseDate.toISOString(),
    updatedAt: baseDate.toISOString(),
  },
]

describe('WorkoutCalendar', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    useCalendarStore.setState({ activeDate: undefined as unknown as Date })
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
  })

  const renderWithProvider = (ui: React.ReactElement) =>
    render(
      <QueryClientProvider client={queryClient}>
        {ui}
      </QueryClientProvider>
    )

  it('renders calendar and title', async () => {
    vi.mocked(workoutApi.getAll).mockResolvedValue({ workouts: [], count: 0 })
    renderWithProvider(<WorkoutCalendar />)

    await waitFor(() => {
      expect(workoutApi.getAll).toHaveBeenCalled()
    })
    expect(screen.getByText(/select_date/i)).toBeInTheDocument()
  })

  it('shows selected date section with title', async () => {
    vi.mocked(workoutApi.getAll).mockResolvedValue({ workouts: [], count: 0 })
    renderWithProvider(<WorkoutCalendar />)

    await waitFor(() => {
      expect(workoutApi.getAll).toHaveBeenCalled()
    })
    expect(screen.getByText(/select_date/i)).toBeInTheDocument()
  })

  it('displays workouts for selected day when data is loaded', async () => {
    vi.mocked(workoutApi.getAll).mockResolvedValue({ workouts: mockWorkouts, count: mockWorkouts.length })
    useCalendarStore.setState({ activeDate: new Date(baseDate) })
    renderWithProvider(<WorkoutCalendar />)

    await waitFor(() => {
      expect(screen.getByText(/squats/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/sets_x/i)).toBeInTheDocument()
  })

  it('shows no workouts message when selected day has none', async () => {
    vi.mocked(workoutApi.getAll).mockResolvedValue({ workouts: [], count: 0 })
    useCalendarStore.setState({ activeDate: new Date() })
    renderWithProvider(<WorkoutCalendar />)

    await waitFor(() => {
      expect(screen.getByText(/no_workouts/i)).toBeInTheDocument()
    })
  })
})
