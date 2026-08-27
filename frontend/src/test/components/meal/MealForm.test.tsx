import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MealForm } from '@/components/features/meal/MealForm'
import { mealApi } from '@/lib/api'

// Mock API
vi.mock('@/lib/api', () => ({
  mealApi: {
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

describe('MealForm', () => {
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
    mockCreate = vi.mocked(mealApi.create)
  })

  const renderWithQueryClient = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    )
  }

  it('renders meal form with initial food item', () => {
    renderWithQueryClient(<MealForm />)

    // Date & meal type labels use mock translation keys (last segment)
    expect(screen.getByText('date_time_label')).toBeInTheDocument()
    expect(screen.getByDisplayValue('breakfast')).toBeInTheDocument()
    expect(screen.getByTestId('meal-food')).toBeInTheDocument()
    expect(screen.getByTestId('meal-quantity')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add_food_item/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /log_meal/i })).toBeInTheDocument()
  })

  it('has correct form structure', () => {
    renderWithQueryClient(<MealForm />)

    const form = document.querySelector('form')
    expect(form).toBeInTheDocument()
    expect(screen.getByDisplayValue('breakfast')).toBeInTheDocument()
    expect(screen.getByTestId('meal-food')).toBeInTheDocument()
    expect(screen.getByTestId('meal-quantity')).toBeInTheDocument()
    expect(screen.getByTestId('meal-calories')).toBeInTheDocument()
    expect(screen.getByTestId('meal-protein')).toBeInTheDocument()
    expect(screen.getByTestId('meal-carbs')).toBeInTheDocument()
    expect(screen.getByTestId('meal-fats')).toBeInTheDocument()
  })

  it('adds new food item when add button is clicked', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<MealForm />)

    const addButton = screen.getByRole('button', { name: /add_food_item/i })
    await user.click(addButton)

    const foodInputs = screen.getAllByTestId('meal-food')
    expect(foodInputs).toHaveLength(2)
  })

  it('submits form with valid data', async () => {
    const user = userEvent.setup()
    const onSuccess = vi.fn()
    mockCreate.mockResolvedValue({ mealId: 'meal-1' })

    renderWithQueryClient(<MealForm onSuccess={onSuccess} />)

    await user.type(screen.getByTestId('meal-food'), 'Oatmeal')
    await user.type(screen.getByTestId('meal-quantity'), '1 cup')

    const logButton = screen.getByRole('button', { name: /log_meal/i })
    await user.click(logButton)

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalled()
      expect(onSuccess).toHaveBeenCalled()
    })
  })

  it('shows loading state during submission', async () => {
    const user = userEvent.setup()
    mockCreate.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ mealId: 'x' }), 100)))

    renderWithQueryClient(<MealForm />)

    // Fill required field so validation passes and mutation starts
    await user.type(screen.getByTestId('meal-food'), 'Oatmeal')
    await user.type(screen.getByTestId('meal-quantity'), '1 cup')

    const logButton = screen.getByRole('button', { name: /log_meal/i })
    await user.click(logButton)

    // Button should be disabled while pending (Spinner shown)
    await waitFor(() => expect(logButton).toBeDisabled())
  })

  it('handles submission error', async () => {
    const user = userEvent.setup()
    mockCreate.mockRejectedValue(new Error('Failed to create meal'))

    renderWithQueryClient(<MealForm />)

    await user.type(screen.getByTestId('meal-food'), 'Oatmeal')
    await user.type(screen.getByTestId('meal-quantity'), '1 cup')

    const logButton = screen.getByRole('button', { name: /log_meal/i })
    await user.click(logButton)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })
})
