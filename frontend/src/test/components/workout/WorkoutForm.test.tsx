import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WorkoutForm } from '@/components/features/workout/WorkoutForm'
import { workoutApi } from '@/lib/api'

// Mock API
vi.mock('@/lib/api', () => ({
  workoutApi: {
    create: vi.fn(),
  },
}))

// Mock date-fns
vi.mock('date-fns', () => ({
  format: vi.fn((date: Date, formatStr: string) => {
    if (formatStr === 'HH:mm') return '09:30'
    return '2024-01-01'
  }),
}))

describe('WorkoutForm', () => {
  let queryClient: QueryClient
  let mockCreate: any

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        mutations: {
          retry: false,
        },
        queries: {
          retry: false,
        },
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

    expect(screen.getByLabelText(/workout date/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/workout time/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/e\.g\. bench press/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add exercise/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /log workout/i })).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<WorkoutForm />)

    const logButton = screen.getByRole('button', { name: /log workout/i })
    await user.click(logButton)

    await waitFor(() => {
      expect(screen.getByText(/exercise name is required/i)).toBeInTheDocument()
    })
  })

  it('adds new exercise when add button is clicked', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<WorkoutForm />)

    const addButton = screen.getByRole('button', { name: /add exercise/i })
    await user.click(addButton)

    // Should now have 2 exercise sections
    const exerciseInputs = screen.getAllByLabelText(/exercise name/i)
    expect(exerciseInputs).toHaveLength(2)
  })

  it('removes exercise when remove button is clicked', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<WorkoutForm />)

    // First add a second exercise
    const addButton = screen.getByRole('button', { name: /add exercise/i })
    await user.click(addButton)

    // Now remove the first exercise
    const removeButtons = screen.getAllByRole('button', { name: /remove exercise/i })
    await user.click(removeButtons[0])

    // Should have only 1 exercise left
    const exerciseInputs = screen.getAllByLabelText(/exercise name/i)
    expect(exerciseInputs).toHaveLength(1)
  })

  it('submits form with valid data', async () => {
    const user = userEvent.setup()
    const onSuccess = vi.fn()
    mockCreate.mockResolvedValue({ workoutId: 'workout-1' })

    renderWithQueryClient(<WorkoutForm onSuccess={onSuccess} />)

    const logButton = screen.getByRole('button', { name: /log workout/i })
    await user.click(logButton)

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          date: expect.any(Date),
          workoutTime: '09:30',
          exercises: expect.arrayContaining([
            expect.objectContaining({
              name: 'Bench Press',
              weight: 80,
              weightUnit: 'kg',
              sets: 3,
              reps: [12, 10, 8],
              restTime: 60,
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

    const logButton = screen.getByRole('button', { name: /log workout/i })
    await user.click(logButton)

    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled()
  })

  it('handles submission error', async () => {
    const user = userEvent.setup()
    mockCreate.mockRejectedValue(new Error('Failed to create workout'))

    renderWithQueryClient(<WorkoutForm />)

    const logButton = screen.getByRole('button', { name: /log workout/i })
    await user.click(logButton)

    await waitFor(() => {
      expect(screen.getByText(/failed to create workout/i)).toBeInTheDocument()
    })
  })

  it('toggles weight unit between kg and lbs', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<WorkoutForm />)

    // Find the weight unit toggle (assuming it exists)
    const weightUnitSelect = screen.getByDisplayValue('kg')
    await user.selectOptions(weightUnitSelect, 'lbs')

    expect(screen.getByDisplayValue('lbs')).toBeInTheDocument()
  })

  it('updates reps array correctly', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<WorkoutForm />)

    // Find reps input by placeholder
    const repsInput = screen.getByPlaceholderText(/e\.g\. 10, 10, 8/i)
    await user.clear(repsInput)
    await user.type(repsInput, '15, 12, 10')

    const logButton = screen.getByRole('button', { name: /log workout/i })
    await user.click(logButton)

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          exercises: expect.arrayContaining([
            expect.objectContaining({
              reps: [15, 12, 10],
            }),
          ]),
        })
      )
    })
  })
})
