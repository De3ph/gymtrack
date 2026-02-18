import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EditWorkoutDialog } from '@/components/features/workout/EditWorkoutDialog'
import { workoutApi } from '@/lib/api'
import type { Workout } from '@/types'

vi.mock('@/lib/api', () => ({
  workoutApi: {
    update: vi.fn(),
  },
}))

const mockWorkout: Workout = {
  workoutId: 'w1',
  athleteId: 'a1',
  date: '2024-06-15T10:00:00.000Z',
  exercises: [
    {
      exerciseId: 'e1',
      name: 'Bench Press',
      weight: 80,
      weightUnit: 'kg',
      sets: 3,
      reps: [12, 10, 8],
      restTime: 60,
    },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

describe('EditWorkoutDialog', () => {
  let queryClient: QueryClient
  let mockUpdate: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
    })
    mockUpdate = vi.mocked(workoutApi.update)
  })

  const renderWithProvider = (open = true) =>
    render(
      <QueryClientProvider client={queryClient}>
        <EditWorkoutDialog
          workout={mockWorkout}
          open={open}
          onOpenChange={vi.fn()}
        />
      </QueryClientProvider>
    )

  it('returns null when workout is null', () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <EditWorkoutDialog workout={null} open={true} onOpenChange={vi.fn()} />
      </QueryClientProvider>
    )
    expect(container.firstChild).toBeNull()
  })

  it('pre-fills form with existing workout data when open', async () => {
    renderWithProvider(true)

    expect(screen.getByDisplayValue('Bench Press')).toBeInTheDocument()
    expect(screen.getByDisplayValue('80')).toBeInTheDocument()
    expect(screen.getByDisplayValue('kg')).toBeInTheDocument()
    expect(screen.getByDisplayValue('3')).toBeInTheDocument()
    expect(screen.getByText(/edit workout/i)).toBeInTheDocument()
    expect(screen.getByText(/within 24 hours/i)).toBeInTheDocument()
  })

  it('shows cancel button and closes on cancel', async () => {
    const onOpenChange = vi.fn()
    render(
      <QueryClientProvider client={queryClient}>
        <EditWorkoutDialog
          workout={mockWorkout}
          open={true}
          onOpenChange={onOpenChange}
        />
      </QueryClientProvider>
    )

    const cancelBtn = screen.getByRole('button', { name: /cancel/i })
    await userEvent.click(cancelBtn)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('has save and cancel buttons when workout is provided', async () => {
    renderWithProvider(true)

    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })
})
