import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import type { DateRange } from 'react-day-picker'
import { DateRangePicker } from '@/components/ui/date-range-picker'

afterEach(() => {
  cleanup()
})

const JAN_1 = new Date(2025, 0, 1)
const JAN_10 = new Date(2025, 0, 10)

function openPicker() {
  fireEvent.click(screen.getByTestId('range-picker'))
}

function day(dayOfMonth: number) {
  const iso = `2025-01-${String(dayOfMonth).padStart(2, '0')}`
  return document.querySelector(`[data-day="${iso}"] button`) as HTMLButtonElement
}

describe('DateRangePicker', () => {
  it('shows the placeholder when no range is selected', () => {
    render(<DateRangePicker data-testid="range-picker" placeholder="Pick a date range" />)

    expect(screen.getByText('Pick a date range')).toBeInTheDocument()
  })

  it('shows both ends of the selected range', () => {
    render(
      <DateRangePicker
        data-testid="range-picker"
        value={{ from: JAN_1, to: new Date(2025, 11, 31) }}
      />,
    )

    expect(screen.getByText(/Jan 1, 2025/)).toBeInTheDocument()
    expect(screen.getByText(/Dec 31, 2025/)).toBeInTheDocument()
  })

  it('completes an open range when the end date is picked', () => {
    const onChange = vi.fn()
    render(
      <DateRangePicker data-testid="range-picker" value={{ from: JAN_1 }} onChange={onChange} />,
    )

    openPicker()
    fireEvent.click(day(20))

    const range = onChange.mock.calls.at(-1)?.[0] as DateRange
    expect(range.from?.getDate()).toBe(1)
    expect(range.to?.getDate()).toBe(20)
  })

  it('starts a new range when a complete range is already selected', () => {
    const onChange = vi.fn()
    render(
      <DateRangePicker
        data-testid="range-picker"
        value={{ from: JAN_1, to: JAN_10 }}
        onChange={onChange}
      />,
    )

    openPicker()
    fireEvent.click(day(20))

    const range = onChange.mock.calls.at(-1)?.[0] as DateRange
    expect(range.from?.getDate()).toBe(20)
    expect(range.to).toBeUndefined()
  })
})
