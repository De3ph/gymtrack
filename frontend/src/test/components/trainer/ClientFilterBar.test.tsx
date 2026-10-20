import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'

import { ClientFilterBar } from '@/components/features/trainer/client-tabs/ClientFilterBar'
import {
  EMPTY_CLIENT_FILTERS,
  type ClientFilters,
} from '@/components/features/trainer/client-tabs/client-filters'

afterEach(() => {
  cleanup()
})

const noop = () => {}

describe('ClientFilterBar', () => {
  it('shows the exercise filter on the workouts tab only', () => {
    const { rerender } = render(
      <ClientFilterBar activeTab="workouts" filters={EMPTY_CLIENT_FILTERS} onChange={noop} />,
    )

    expect(screen.getByLabelText('Exercise Type')).toBeInTheDocument()
    expect(screen.queryByLabelText('Meal Type')).not.toBeInTheDocument()

    rerender(
      <ClientFilterBar activeTab="meals" filters={EMPTY_CLIENT_FILTERS} onChange={noop} />,
    )

    expect(screen.queryByLabelText('Exercise Type')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Meal Type')).toBeInTheDocument()
  })

  it('keeps the date range available on every history tab', () => {
    render(
      <ClientFilterBar activeTab="measurements" filters={EMPTY_CLIENT_FILTERS} onChange={noop} />,
    )

    expect(screen.getByTestId('client-filter-date-range')).toBeInTheDocument()
    expect(screen.queryByLabelText('Exercise Type')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Meal Type')).not.toBeInTheDocument()
  })

  it('defers the exercise filter until Apply is pressed', () => {
    const onChange = vi.fn()
    render(
      <ClientFilterBar activeTab="workouts" filters={EMPTY_CLIENT_FILTERS} onChange={onChange} />,
    )

    const apply = screen.getByRole('button', { name: 'Apply' })
    expect(apply).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Exercise Type'), {
      target: { value: 'Bench' },
    })

    expect(onChange).not.toHaveBeenCalled()
    expect(apply).toBeEnabled()

    fireEvent.click(apply)

    expect(onChange).toHaveBeenCalledWith({
      ...EMPTY_CLIENT_FILTERS,
      exerciseType: 'Bench',
    })
  })

  it('reports how many filters are shaping the active tab', () => {
    const filters: ClientFilters = {
      ...EMPTY_CLIENT_FILTERS,
      start: '2026-10-01',
      exerciseType: 'Bench',
      mealType: 'lunch',
    }

    const { rerender } = render(
      <ClientFilterBar activeTab="workouts" filters={filters} onChange={noop} />,
    )

    // A lingering meal filter must not be counted on the workouts tab.
    expect(screen.getByText('2 filters active')).toBeInTheDocument()

    rerender(<ClientFilterBar activeTab="meals" filters={filters} onChange={noop} />)

    // The date range and the meal type, not the exercise filter.
    expect(screen.getByText('2 filters active')).toBeInTheDocument()
  })

  it('does not submit a draft that belongs to another tab', () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <ClientFilterBar activeTab="workouts" filters={EMPTY_CLIENT_FILTERS} onChange={onChange} />,
    )

    fireEvent.change(screen.getByLabelText('Exercise Type'), {
      target: { value: 'Bench' },
    })

    rerender(
      <ClientFilterBar activeTab="meals" filters={EMPTY_CLIENT_FILTERS} onChange={onChange} />,
    )

    // The exercise draft is not visible here, so there is nothing to apply.
    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled()

    // ...and it is still there when the trainer returns to Workouts.
    rerender(
      <ClientFilterBar activeTab="workouts" filters={EMPTY_CLIENT_FILTERS} onChange={onChange} />,
    )

    expect(screen.getByLabelText('Exercise Type')).toHaveValue('Bench')
    expect(screen.getByRole('button', { name: 'Apply' })).toBeEnabled()
  })

  it('clears only the date range', () => {
    const onChange = vi.fn()
    const filters: ClientFilters = {
      ...EMPTY_CLIENT_FILTERS,
      start: '2026-10-01',
      end: '2026-10-05',
      exerciseType: 'Bench',
    }

    render(<ClientFilterBar activeTab="workouts" filters={filters} onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Clear dates' }))
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))

    expect(onChange).toHaveBeenCalledWith({ ...filters, start: '', end: '' })
  })

  it('clears every filter at once', () => {
    const onChange = vi.fn()
    render(
      <ClientFilterBar
        activeTab="workouts"
        filters={{ ...EMPTY_CLIENT_FILTERS, start: '2026-10-01', exerciseType: 'Bench' }}
        onChange={onChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))

    expect(onChange).toHaveBeenCalledWith(EMPTY_CLIENT_FILTERS)
  })
})
