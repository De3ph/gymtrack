import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WorkoutForm } from '@/components/features/workout/WorkoutForm'

describe('WorkoutForm - Basic Tests', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    })
  })

  const renderWithQueryClient = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    )
  }

  it('renders workout form with basic elements', () => {
    renderWithQueryClient(<WorkoutForm />)

    expect(screen.getByText(/fallback_name/i)).toBeInTheDocument()
    expect(screen.getByText(/fallback_name/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add_exercise/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument()
  })

  it('has correct form structure', () => {
    renderWithQueryClient(<WorkoutForm />)

    expect(screen.getByText(/fallback_name/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add_exercise/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument()
  })
})
