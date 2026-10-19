import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { BodyMeasurementFilterBar } from '@/components/features/body-measurement/BodyMeasurementFilterBar'

afterEach(() => {
  cleanup()
})

/** ISO date of the given day in the month the calendar opens on (today). */
function isoOfCurrentMonth(day: number) {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function dayButton(day: number) {
  return document.querySelector(`[data-day="${isoOfCurrentMonth(day)}"] button`) as HTMLButtonElement
}

describe('BodyMeasurementFilterBar', () => {
  it('renders a single date range control', () => {
    render(<BodyMeasurementFilterBar filter={{}} onChange={() => {}} />)

    expect(screen.getByTestId('measurement-date-range')).toBeInTheDocument()
    expect(screen.getByText('Pick a date range')).toBeInTheDocument()
  })

  it('applies the picked range as start and end dates', () => {
    const onChange = vi.fn()
    render(<BodyMeasurementFilterBar filter={{}} onChange={onChange} />)

    fireEvent.click(screen.getByTestId('measurement-date-range'))
    fireEvent.click(dayButton(10))
    fireEvent.click(dayButton(20))

    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))

    expect(onChange).toHaveBeenCalledTimes(1)
    const applied = onChange.mock.calls[0][0] as { startDate?: string; endDate?: string }
    expect(new Date(applied.startDate!).getDate()).toBe(10)
    expect(new Date(applied.endDate!).getDate()).toBe(20)
    // The end bound covers the whole last day of the range.
    expect(new Date(applied.endDate!).getHours()).toBe(23)
  })

  it('clears the filter', () => {
    const onChange = vi.fn()
    render(
      <BodyMeasurementFilterBar
        filter={{ startDate: '2025-01-01T00:00:00.000Z' }}
        onChange={onChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))

    expect(onChange).toHaveBeenCalledWith({})
  })
})
