import { render, screen, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MealList } from '@/components/features/meal/MealList'
import { mealApi } from '@/lib/api'
import type { Meal } from '@/types'

vi.mock('@/lib/api', () => ({
  mealApi: {
    getAll: vi.fn(),
  },
}))

const mockMeals: Meal[] = [
  {
    mealId: 1,
    athleteId: 1,
    date: new Date().toISOString(),
    mealType: 'breakfast',
    items: [
      { food: 'Oatmeal', quantity: '1 cup', calories: 150, macros: { protein: 5, carbs: 27, fats: 3 } },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

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

  it('shows meal meta (items and kcal)', () => {
    renderWithProvider(<MealList meals={mockMeals} />)

    // DESIGN refactor: meta now "1 items · 150 kcal" with mono styling, still contains both tokens
    expect(screen.getByText(/items/i)).toBeInTheDocument()
    expect(screen.getAllByText(/kcal/i).length).toBeGreaterThanOrEqual(1)
  })

  it('shows empty state when no meals', () => {
    renderWithProvider(<MealList meals={[]} />)

    expect(screen.getByText(/no meals yet/i)).toBeInTheDocument()
  })

  it('shows loading state when fetching and no props', () => {
    vi.mocked(mealApi.getAll).mockImplementation(() => new Promise(() => { }))
    renderWithProvider(<MealList />)

    expect(screen.getByText(/loading meals/i)).toBeInTheDocument()
  })

  it('fetches meals when no props provided', async () => {
    vi.mocked(mealApi.getAll).mockResolvedValue({ meals: mockMeals, count: mockMeals.length })
    renderWithProvider(<MealList />)

    await waitFor(() => {
      expect(mealApi.getAll).toHaveBeenCalled()
    })
    await waitFor(() => {
      expect(screen.getByText(/oatmeal/i)).toBeInTheDocument()
    })
  })
})
