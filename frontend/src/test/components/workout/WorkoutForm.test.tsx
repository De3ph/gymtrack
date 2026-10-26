import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WorkoutForm } from '@/components/features/workout/WorkoutForm'
import { workoutApi } from '@/lib/api'
import type { Workout } from '@/types'

vi.mock('@/lib/api', () => ({
  workoutApi: {
    create: vi.fn(),
  },
}))

/**
 * The submit validator requires a non-empty `exerciseId` and `name`, which the
 * blank default exercise does not satisfy, so a pristine form can never reach
 * `onSubmit`. Seeding the form from a saved workout produces valid values
 * without driving the exercise picker (a client-only dynamic import).
 */
const validWorkout: Workout = {
  type: 'workout',
  workoutId: 1,
  athleteId: 1,
  date: '2024-01-15T10:00:00.000Z',
  exercises: [
    {
      exerciseId: 42,
      name: 'Bench Press',
      sets: [
        { weight: 80, weightUnit: 'kg', reps: 10, restTime: 60, completed: false },
      ],
    },
  ],
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
}

describe('WorkoutForm', () => {
  let queryClient: QueryClient
  let mockCreate: Mock

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    })
    mockCreate = vi.mocked(workoutApi.create)
  })

  const renderWithQueryClient = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    )
  }

  it('renders workout form with initial exercise', () => {
    renderWithQueryClient(<WorkoutForm />)

    expect(screen.getByText(/exercise \d/i)).toBeInTheDocument()
    expect(screen.getByText(/exercise \d/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add exercise/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /log workout/i })).toBeInTheDocument()
  })

  it('adds new exercise when add button is clicked', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<WorkoutForm />)

    const titlesBefore = screen.getAllByText(/exercise \d/i)
    expect(titlesBefore.length).toBe(1)

    const addButton = screen.getByRole('button', { name: /add exercise/i })
    await user.click(addButton)

    const titlesAfter = screen.getAllByText(/exercise \d/i)
    expect(titlesAfter.length).toBe(2)
  })

  it('removes exercise when remove button is clicked', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<WorkoutForm />)

    const titlesBefore = screen.getAllByText(/exercise \d/i)
    expect(titlesBefore.length).toBe(1)

    const addButton = screen.getByRole('button', { name: /add exercise/i })
    await user.click(addButton)

    const titlesAfterAdd = screen.getAllByText(/exercise \d/i)
    expect(titlesAfterAdd.length).toBe(2)

    // Target the remove button by its accessible name. Selecting "any button
    // containing an svg" matched the collapse toggle, which also holds an icon
    // and comes first in the DOM, so the exercise was never removed.
    const removeButtons = screen.getAllByRole('button', { name: /remove set/i })
    expect(removeButtons.length).toBeGreaterThan(0)
    await user.click(removeButtons[0])

    await waitFor(() => {
      expect(screen.getAllByText(/exercise \d/i).length).toBe(1)
    })
  })

  it('submits form with valid data', async () => {
    const user = userEvent.setup()
    const onSuccess = vi.fn()
    mockCreate.mockResolvedValue({ workoutId: 'workout-1' })

    renderWithQueryClient(<WorkoutForm workout={validWorkout} onSuccess={onSuccess} />)

    const submitButton = screen.getByRole('button', { name: /log workout/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          date: expect.any(String),
          exercises: expect.arrayContaining([
            expect.objectContaining({
              name: expect.any(String),
              sets: expect.arrayContaining([
                expect.objectContaining({
                  weight: expect.any(Number),
                  reps: expect.any(Number),
                  setType: 'working',
                }),
              ]),
            }),
          ]),
        }),
      );
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled()
    })
  })

  it('shows loading state during submission', async () => {
    const user = userEvent.setup()
    // Never settles: `await user.click()` takes long enough under jsdom that a
    // short timeout can resolve before the assertion runs, making this flaky.
    mockCreate.mockImplementation(() => new Promise(() => {}))

    renderWithQueryClient(<WorkoutForm workout={validWorkout} />)

    const submitButton = screen.getByRole('button', { name: /log workout/i })
    await user.click(submitButton)

    // While pending the label switches to the translated "submitting" copy so
    // the state is announced, not just implied by a spinner.
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled()
    })
  })

  it('handles submission error', async () => {
    const user = userEvent.setup()
    mockCreate.mockRejectedValue(new Error('Failed to create workout'))

    renderWithQueryClient(<WorkoutForm workout={validWorkout} />)

    const submitButton = screen.getByRole('button', { name: /log workout/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalled()
    })
  })
})
