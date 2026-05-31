import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WorkoutForm } from '@/components/features/workout/WorkoutForm'
import { workoutApi } from '@/lib/api'

vi.mock('@/lib/api', () => ({
  workoutApi: {
    create: vi.fn(),
  },
}))

describe('WorkoutForm', () => {
  let queryClient: QueryClient
  let mockCreate: any

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

    expect(screen.getByText(/fallback_name/i)).toBeInTheDocument()
    expect(screen.getByText(/fallback_name/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add_exercise/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument()
  })

  it('adds new exercise when add button is clicked', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<WorkoutForm />)

    const titlesBefore = screen.getAllByText(/fallback_name/i)
    expect(titlesBefore.length).toBe(1)

    const addButton = screen.getByRole('button', { name: /add_exercise/i })
    await user.click(addButton)

    const titlesAfter = screen.getAllByText(/fallback_name/i)
    expect(titlesAfter.length).toBe(2)
  })

  it('removes exercise when remove button is clicked', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<WorkoutForm />)

    const titlesBefore = screen.getAllByText(/fallback_name/i)
    expect(titlesBefore.length).toBe(1)

    const addButton = screen.getByRole('button', { name: /add_exercise/i })
    await user.click(addButton)

    const titlesAfterAdd = screen.getAllByText(/fallback_name/i)
    expect(titlesAfterAdd.length).toBe(2)

    const removeButtons = screen.getAllByRole('button')
    const trashButtons = removeButtons.filter(b => b.querySelector('svg'))
    if (trashButtons.length > 0) {
      await user.click(trashButtons[0])
    }

    await waitFor(() => {
      expect(screen.getAllByText(/fallback_name/i).length).toBe(1)
    })
  })

  it('submits form with valid data', async () => {
    const user = userEvent.setup()
    const onSuccess = vi.fn()
    mockCreate.mockResolvedValue({ workoutId: 'workout-1' })

    renderWithQueryClient(<WorkoutForm onSuccess={onSuccess} />)

    const submitButton = screen.getByRole('button', { name: /submit/i })
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
                }),
              ]),
            }),
          ]),
        })
      )
    })

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled()
    })
  })

  it('shows loading state during submission', async () => {
    const user = userEvent.setup()
    mockCreate.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

    renderWithQueryClient(<WorkoutForm />)

    const submitButton = screen.getByRole('button', { name: /submit/i })
    await user.click(submitButton)

    expect(screen.getByRole('button', { name: /submit/i })).toBeDisabled()
  })

  it('handles submission error', async () => {
    const user = userEvent.setup()
    mockCreate.mockRejectedValue(new Error('Failed to create workout'))

    renderWithQueryClient(<WorkoutForm />)

    const submitButton = screen.getByRole('button', { name: /submit/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalled()
    })
  })
})
