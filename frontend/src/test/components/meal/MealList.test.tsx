import { render, screen, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MealList } from '@/components/features/meal/MealList'
import { mealApi } from '@/lib/api'
import type { Meal } from '@/types'

vi.mock('@/lib/api', () => ({
  mealApi: {
    getAll: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockMeals: Meal[] = [
  {
    mealId: 'm1',
    athleteId: 'a1',
    date: new Date().toISOString(),
    mealType: 'breakfast',
    items: [
      { food: 'Oatmeal', quantity: '1 cup', calories: 150, macros: { protein: 5, carbs: 27, fats: 3 } },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

const oldMeal: Meal = {
  ...mockMeals[0],
  mealId: 'm2',
  createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
}

describe('MealList', () => {
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

  it('displays meal entries when data is provided via props', () => {
    renderWithProvider(<MealList meals={mockMeals} />)

    expect(screen.getByText(/breakfast/i)).toBeInTheDocument()
    expect(screen.getByText(/oatmeal/i)).toBeInTheDocument()
    expect(screen.getByText(/1 cup/i)).toBeInTheDocument()
    expect(screen.getAllByText(/kcal/i).length).toBeGreaterThanOrEqual(1)
  })

  it('shows daily summary calories in card description', () => {
    renderWithProvider(<MealList meals={mockMeals} />)

    expect(screen.getByText(/Items -/)).toBeInTheDocument()
    expect(screen.getAllByText(/kcal/i).length).toBeGreaterThanOrEqual(1)
  })

  it('shows empty state when no meals', () => {
    renderWithProvider(<MealList meals={[]} />)

    expect(screen.getByText(/no meals logged yet/i)).toBeInTheDocument()
    expect(screen.getByText(/start tracking your nutrition/i)).toBeInTheDocument()
  })

  it('shows loading state when fetching and no props', () => {
    vi.mocked(mealApi.getAll).mockImplementation(() => new Promise(() => {}))
    renderWithProvider(<MealList />)

    expect(screen.getByText(/loading meals/i)).toBeInTheDocument()
  })

  it('hides edit and delete buttons when readOnly', () => {
    renderWithProvider(<MealList meals={mockMeals} readOnly />)

    expect(screen.getByText(/oatmeal/i)).toBeInTheDocument()
    const buttons = screen.queryAllByRole('button')
    expect(buttons.length).toBe(0)
  })

  it('fetches meals when no props provided', async () => {
    vi.mocked(mealApi.getAll).mockResolvedValue({ meals: mockMeals })
    renderWithProvider(<MealList />)

    await waitFor(() => {
      expect(mealApi.getAll).toHaveBeenCalled()
    })
    await waitFor(() => {
      expect(screen.getByText(/oatmeal/i)).toBeInTheDocument()
    })
  })
})
