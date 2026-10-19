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

const olderWorkout: Workout = {
  ...mockWorkouts[0],
  workoutId: 2,
  date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  exercises: [
    {
      exerciseId: 2,
      name: 'Back Squat',
      sets: [{ weight: 100, weightUnit: 'kg' as const, reps: 5, restTime: 90, completed: false }],
    },
  ],
}

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
    expect(screen.getByText(/3 sets/i)).toBeInTheDocument()
    expect(screen.getAllByText(/kg x \d+/i)).toHaveLength(3)
  })

  it('shows empty state when no workouts', () => {
    renderWithProvider(<WorkoutList workouts={[]} />)

    expect(screen.getByText(/no workouts yet/i)).toBeInTheDocument()
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

  it('collapses every card except the most recent one by default', () => {
    renderWithProvider(<WorkoutList workouts={[mockWorkouts[0], olderWorkout]} />)

    // The newest card stays open, the older one starts collapsed.
    expect(screen.getByText(/bench press/i)).toBeInTheDocument()
    expect(screen.queryByText(/back squat/i)).not.toBeInTheDocument()

    const collapsed = screen.getByRole('button', { name: /expand workout/i })
    expect(collapsed).toHaveAttribute('aria-expanded', 'false')
  })

  it('keeps every card expanded when collapsing is disabled', () => {
    renderWithProvider(
      <WorkoutList workouts={[mockWorkouts[0], olderWorkout]} collapseAllExceptNewest={false} />,
    )

    expect(screen.getByText(/bench press/i)).toBeInTheDocument()
    expect(screen.getByText(/back squat/i)).toBeInTheDocument()
  })

  it('windows pagination instead of rendering a link per page', async () => {
    const user = userEvent.setup()
    const onPageChange = vi.fn()
    // 500 rows / WORKOUT_PAGE_SIZE(10) = 50 pages; unwindowed that is 50 links.
    renderWithProvider(
      <WorkoutList
        workouts={mockWorkouts}
        totalCount={500}
        page={25}
        onPageChange={onPageChange}
      />,
    )

    // prev + next + the windowed pages 1, 24, 25, 26, 50.
    const pageLinks = Array.from(
      document.querySelectorAll('[data-slot="pagination-link"]'),
    )
      .map((el) => el.textContent?.trim())
      .filter((text): text is string => Boolean(text) && /^\d+$/.test(text ?? ''))

    // 1 … 24 25 26 … 50 — never one link per page.
    expect(pageLinks).toEqual(['1', '24', '25', '26', '50'])

    // PaginationLink renders an <a> without href, so it has no "link" role;
    // select it by data-slot + text instead.
    const pageFifty = Array.from(
      document.querySelectorAll('[data-slot="pagination-link"]'),
    ).find((el) => el.textContent?.trim() === '50')
    expect(pageFifty).toBeDefined()
    await user.click(pageFifty as HTMLElement)
    expect(onPageChange).toHaveBeenCalledWith(50)
  })
})
