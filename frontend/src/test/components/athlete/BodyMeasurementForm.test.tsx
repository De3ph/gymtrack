import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach, afterEach, type Mock } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BodyMeasurementForm } from '@/components/features/body-measurement/BodyMeasurementForm'
import { bodyMeasurementApi } from '@/lib/api'
import type { BodyMeasurement } from '@/types'

vi.mock('@/lib/api', () => ({
  bodyMeasurementApi: {
    create: vi.fn(),
    update: vi.fn(),
    getLatest: vi.fn(),
  },
}))

vi.mock('@/lib/actions/cache', () => ({
  revalidateBodyMeasurementsCache: vi.fn().mockResolvedValue(undefined),
}))

const makeMeasurement = (overrides: Partial<BodyMeasurement> = {}): BodyMeasurement =>
  ({
    type: 'body_measurement',
    measurementId: 7,
    athleteId: 1,
    date: '2024-05-04T08:30:00.000Z',
    weight: 81.5,
    weightUnit: 'lbs',
    bodyFatPct: 14.2,
    parts: { chest: { value: 102 } },
    notes: 'felt strong',
    ...overrides,
  }) as BodyMeasurement

describe('BodyMeasurementForm unit Select', () => {
  let queryClient: QueryClient
  let mockGetLatest: Mock
  let consoleErrorSpy: Mock

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    })
    mockGetLatest = vi.mocked(bodyMeasurementApi.getLatest)
    // React reports the controlled/uncontrolled violation through console.error.
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  const renderForm = (
    props: Partial<React.ComponentProps<typeof BodyMeasurementForm>> = {},
  ) =>
    render(
      <QueryClientProvider client={queryClient}>
        <BodyMeasurementForm {...props} />
      </QueryClientProvider>,
    )

  // The unit Select is the only combobox in this form.
  const unitTrigger = () => screen.getByRole('combobox')

  const controlledSelectWarnings = () =>
    consoleErrorSpy.mock.calls.filter((call) =>
      String(call[0]).includes('uncontrolled'),
    )

  it('renders the unit Select controlled with a default value', () => {
    renderForm()

    expect(unitTrigger()).toHaveTextContent('kg')
    expect(controlledSelectWarnings()).toHaveLength(0)
  })

  it('seeds the unit Select from initialMeasurement', () => {
    renderForm({ initialMeasurement: makeMeasurement({ weightUnit: 'lbs' }) })

    expect(unitTrigger()).toHaveTextContent('lbs')
    expect(controlledSelectWarnings()).toHaveLength(0)
  })

  // Regression: `GET /measurements/latest` answers 204 for an athlete with no
  // measurements, which api-client surfaces as null. That null used to reach
  // form.reset() and set weightUnit to undefined, flipping the Select from
  // controlled to uncontrolled.
  it('keeps the unit Select controlled when "Use Previous" returns no measurement', async () => {
    const user = userEvent.setup()
    // Exactly what api-client produces for a 204 response.
    mockGetLatest.mockResolvedValue(null)
    renderForm()

    await user.click(screen.getByRole('button', { name: /use previous/i }))

    await waitFor(() => expect(mockGetLatest).toHaveBeenCalledTimes(1))

    expect(unitTrigger()).toHaveTextContent('kg')
    expect(controlledSelectWarnings()).toHaveLength(0)
    expect(screen.getByRole('alert')).toHaveTextContent(/no previous measurement found/i)
  })

  it('keeps the unit Select controlled when "Use Previous" omits weightUnit', async () => {
    const user = userEvent.setup()
    mockGetLatest.mockResolvedValue({
      date: '2024-05-04T08:30:00.000Z',
      weight: 81.5,
    })
    renderForm()

    await user.click(screen.getByRole('button', { name: /use previous/i }))

    await waitFor(() => expect(mockGetLatest).toHaveBeenCalledTimes(1))

    expect(unitTrigger()).toHaveTextContent('kg')
    expect(controlledSelectWarnings()).toHaveLength(0)
  })

  it('stays controlled when the unit is changed through the Select', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(unitTrigger())

    const listbox = await screen.findByRole('listbox')
    await user.click(within(listbox).getByRole('option', { name: 'lbs' }))

    await waitFor(() => expect(unitTrigger()).toHaveTextContent('lbs'))
    expect(controlledSelectWarnings()).toHaveLength(0)
  })
})
