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
    
    expect(screen.getByLabelText(/workout date/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/workout time/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/e\.g\. bench press/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add exercise/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /log workout/i })).toBeInTheDocument()
  })

  it('has correct form structure', () => {
    renderWithQueryClient(<WorkoutForm />)
    
    // Check for form element
    const form = screen.getByRole('form')
    expect(form).toBeInTheDocument()
    
    // Check for exercise section
    expect(screen.getByText(/exercise 1/i)).toBeInTheDocument()
    
    // Check for input fields
    expect(screen.getByPlaceholderText(/e\.g\. bench press/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/weight/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/e\.g\. 10, 10, 8/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/rest\(s\)/i)).toBeInTheDocument()
  })
})
