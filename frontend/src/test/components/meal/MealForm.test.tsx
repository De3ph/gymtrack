import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
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
  let mockCreate: any

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

    expect(screen.getByLabelText(/meal date/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/meal time/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue('breakfast')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/food item/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/quantity/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add food item/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /log meal/i })).toBeInTheDocument()
  })

  it('has correct form structure', () => {
    renderWithQueryClient(<MealForm />)

    // Check for form element
    const form = screen.getByRole('form')
    expect(form).toBeInTheDocument()

    // Check for meal type selector
    expect(screen.getByDisplayValue('breakfast')).toBeInTheDocument()

    // Check for food item section
    expect(screen.getByPlaceholderText(/food item/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/quantity/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/calories/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/protein/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/carbs/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/fats/i)).toBeInTheDocument()
  })

  it('adds new food item when add button is clicked', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<MealForm />)

    const addButton = screen.getByRole('button', { name: /add food item/i })
    await user.click(addButton)

    // Should now have 2 food item sections
    const foodInputs = screen.getAllByPlaceholderText(/food item/i)
    expect(foodInputs).toHaveLength(2)
  })

  it('submits form with valid data', async () => {
    const user = userEvent.setup()
    const onSuccess = vi.fn()
    mockCreate.mockResolvedValue({ mealId: 'meal-1' })

    renderWithQueryClient(<MealForm onSuccess={onSuccess} />)

    // Fill in required fields
    const foodInput = screen.getByPlaceholderText(/food item/i)
    await user.type(foodInput, 'Oatmeal')

    const logButton = screen.getByRole('button', { name: /log meal/i })
    await user.click(logButton)

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalled()
      expect(onSuccess).toHaveBeenCalled()
    })
  })

  it('shows loading state during submission', async () => {
    const user = userEvent.setup()
    mockCreate.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

    renderWithQueryClient(<MealForm />)

    const logButton = screen.getByRole('button', { name: /log meal/i })
    await user.click(logButton)

    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled()
  })

  it('handles submission error', async () => {
    const user = userEvent.setup()
    mockCreate.mockRejectedValue(new Error('Failed to create meal'))

    renderWithQueryClient(<MealForm />)

    const logButton = screen.getByRole('button', { name: /log meal/i })
    await user.click(logButton)

    await waitFor(() => {
      expect(screen.getByText(/failed to create meal/i)).toBeInTheDocument()
    })
  })
})
