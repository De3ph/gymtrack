import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BodyMeasurementList } from '@/components/features/body-measurement/BodyMeasurementList'
import type { BodyMeasurement } from '@/types'

vi.mock('@/lib/api', () => ({
  bodyMeasurementApi: {
    getAll: vi.fn(),
  },
}))

const now = new Date()
const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

const newestMeasurement: BodyMeasurement = {
  athleteId: 1,
  measurementId: 1,
  date: now.toISOString(),
  weight: 80,
  weightUnit: 'kg',
  bodyFatPct: 15,
  notes: 'Newest note',
  createdAt: now.toISOString(),
}

const olderMeasurement: BodyMeasurement = {
  athleteId: 1,
  measurementId: 2,
  date: weekAgo.toISOString(),
  weight: 81,
  weightUnit: 'kg',
  notes: 'Older note',
  createdAt: weekAgo.toISOString(),
}

describe('BodyMeasurementList', () => {
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

  it('collapses every row except the most recent one by default', () => {
    renderWithProvider(
      <BodyMeasurementList measurements={[newestMeasurement, olderMeasurement]} />,
    )

    // The newest row stays open, the older one starts collapsed.
    expect(screen.getByText(/newest note/i)).toBeInTheDocument()
    expect(screen.queryByText(/older note/i)).not.toBeInTheDocument()

    const collapsed = screen.getByRole('button', { name: /expand measurement/i })
    expect(collapsed).toHaveAttribute('aria-expanded', 'false')
  })

  it('keeps every row expanded when collapsing is disabled', () => {
    renderWithProvider(
      <BodyMeasurementList
        measurements={[newestMeasurement, olderMeasurement]}
        collapseAllExceptNewest={false}
      />,
    )

    expect(screen.getByText(/newest note/i)).toBeInTheDocument()
    expect(screen.getByText(/older note/i)).toBeInTheDocument()
  })

  it('shows the weight summary even while a row is collapsed', () => {
    renderWithProvider(
      <BodyMeasurementList measurements={[newestMeasurement, olderMeasurement]} />,
    )

    expect(screen.getByText('80.0 kg')).toBeInTheDocument()
    expect(screen.getByText('81.0 kg')).toBeInTheDocument()
  })
})
