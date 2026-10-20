import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WorkoutForm } from '@/components/features/workout/WorkoutForm'

vi.mock('@/lib/api', () => ({
  workoutApi: {
    create: vi.fn(),
  },
  workoutPlanApi: {
    getAll: vi.fn().mockResolvedValue({ plans: [] }),
    getMyPlans: vi.fn().mockResolvedValue({ plans: [] }),
  },
  exerciseApi: {
    getMuscleGroups: vi.fn().mockResolvedValue([]),
    getEquipment: vi.fn().mockResolvedValue([]),
    search: vi.fn().mockResolvedValue([]),
  },
}))

describe('WorkoutForm — add exercise opens the picker', () => {
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

  const renderForm = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <WorkoutForm />
      </QueryClientProvider>
    )

  it('opens the exercise picker dialog when "add exercise" is clicked', async () => {
    const user = userEvent.setup()
    renderForm()

    // The picker is a client-only dynamic import, so the trigger is only
    // rendered once the chunk has loaded.
    await waitFor(
      () => {
        expect(
          screen.getAllByRole('button', { name: /pick exercise/i }).length
        ).toBeGreaterThan(0)
      },
      { timeout: 10000 }
    )

    expect(
      screen.queryByRole('dialog', { name: /select exercise/i })
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /add exercise/i }))

    await waitFor(
      () => {
        expect(
          screen.getByRole('dialog', { name: /select exercise/i })
        ).toBeInTheDocument()
      },
      { timeout: 10000 }
    )
  }, 20000)

  it('keeps the picker on the right row when an earlier row is removed', async () => {
    const user = userEvent.setup()
    renderForm()

    await waitFor(
      () => {
        expect(
          screen.getAllByRole('button', { name: /pick exercise/i }).length
        ).toBeGreaterThan(0)
      },
      { timeout: 10000 }
    )

    // Add a second row, which opens the second row's picker.
    await user.click(screen.getByRole('button', { name: /add exercise/i }))
    await waitFor(
      () => {
        expect(
          screen.getByRole('dialog', { name: /select exercise/i })
        ).toBeInTheDocument()
      },
      { timeout: 10000 }
    )

    // Close the picker, then remove the first row. The second row shifts down
    // to index 0, so its picker must be re-targeted at the new index.
    await user.keyboard('{Escape}')
    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: /select exercise/i })
      ).not.toBeInTheDocument()
    })

    const removeButtons = screen.getAllByRole('button', { name: /remove set/i })
    await user.click(removeButtons[0])

    // The sortable row wrapper is itself exposed as a button (dnd-kit's
    // attributes), and its accessible name includes its contents — so scope
    // the count to the actual picker triggers.
    const pickButtons = screen
      .getAllByRole('button', { name: /pick exercise/i })
      .filter((button) => button.getAttribute('data-slot') === 'dialog-trigger')
    expect(pickButtons.length).toBe(1)

    // Clicking the remaining row's trigger must open the picker for that row.
    await user.click(pickButtons[0])
    await waitFor(
      () => {
        expect(
          screen.getByRole('dialog', { name: /select exercise/i })
        ).toBeInTheDocument()
      },
      { timeout: 10000 }
    )
  }, 20000)
})
