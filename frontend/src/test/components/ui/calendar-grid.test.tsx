import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { CalendarGrid, markerStyles } from '@/components/ui/calendar-grid'

const OCT_2025 = new Date(2025, 9, 1) // October 2025, controlled view month
const dayCell = (container: HTMLElement, iso: string) =>
  container.querySelector(`td[data-day="${iso}"]`)

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('CalendarGrid', () => {
  describe('layout modes', () => {
    it('renders a titled panel with header when a title is given', () => {
      const { container } = render(
        <CalendarGrid
          selected={new Date(2025, 9, 15)}
          month={OCT_2025}
          onMonthChange={() => {}}
          title="Workout Calendar"
        />,
      )

      expect(screen.getByRole('heading', { name: 'Workout Calendar' })).toBeInTheDocument()
      expect(container.firstElementChild).toHaveClass('border', 'border-border')
      expect(container.querySelector('header')).toBeInTheDocument()
    })

    it('renders bare chrome when no title is given', () => {
      const { container } = render(
        <CalendarGrid selected={new Date(2025, 9, 15)} month={OCT_2025} onMonthChange={() => {}} />,
      )

      expect(screen.queryByRole('heading')).not.toBeInTheDocument()
      expect(container.querySelector('header')).not.toBeInTheDocument()
      // Bare mode is still a bordered box, just without the header/footer panel.
      expect(container.firstElementChild).toHaveClass('border', 'border-border')
      expect(container.querySelector('footer')).not.toBeInTheDocument()
    })

    it('merges caller classes onto the wrapper and the calendar', () => {
      const { container } = render(
        <CalendarGrid
          month={OCT_2025}
          onMonthChange={() => {}}
          title="Meal Calendar"
          className="bg-card"
          calendarClassName="border-0"
        />,
      )

      expect(container.firstElementChild).toHaveClass('bg-card')
      expect(container.querySelector('[data-slot="calendar"]')).toHaveClass('border-0')
    })
  })

  describe('day markers', () => {
    it('applies a marker class to days in that series', () => {
      const { container } = render(
        <CalendarGrid
          month={OCT_2025}
          onMonthChange={() => {}}
          markers={[
            { name: 'workout', dates: [new Date(2025, 9, 20)], className: markerStyles.workoutUnderline },
          ]}
        />,
      )

      expect(dayCell(container, '2025-10-20')).toHaveClass('underline', 'underline-offset-4')
      expect(dayCell(container, '2025-10-21')).not.toHaveClass('underline')
    })

    it('renders multiple series independently on the same grid', () => {
      const { container } = render(
        <CalendarGrid
          month={OCT_2025}
          onMonthChange={() => {}}
          markers={[
            { name: 'workout', dates: [new Date(2025, 9, 20)], className: markerStyles.workoutDot },
            { name: 'meal', dates: [new Date(2025, 9, 21)], className: markerStyles.mealDot },
          ]}
        />,
      )

      expect(dayCell(container, '2025-10-20')).toHaveClass('text-primary')
      expect(dayCell(container, '2025-10-20')).not.toHaveClass('text-teal-600')
      expect(dayCell(container, '2025-10-21')).toHaveClass('text-teal-600')
      expect(dayCell(container, '2025-10-21')).not.toHaveClass('text-primary')
    })

    it('marks every day in a series, including duplicates', () => {
      const { container } = render(
        <CalendarGrid
          month={OCT_2025}
          onMonthChange={() => {}}
          markers={[
            {
              name: 'workout',
              dates: [new Date(2025, 9, 20), new Date(2025, 9, 20), new Date(2025, 9, 27)],
              className: markerStyles.workoutUnderline,
            },
          ]}
        />,
      )

      expect(dayCell(container, '2025-10-20')).toHaveClass('underline')
      expect(dayCell(container, '2025-10-27')).toHaveClass('underline')
    })

    it('renders without markers when none are supplied', () => {
      const { container } = render(<CalendarGrid month={OCT_2025} onMonthChange={() => {}} />)

      expect(dayCell(container, '2025-10-20')).not.toHaveClass('underline')
    })
  })

  describe('selection', () => {
    it('reports the clicked day', () => {
      const onSelect = vi.fn()
      const { container } = render(
        <CalendarGrid month={OCT_2025} onMonthChange={() => {}} onSelect={onSelect} />,
      )

      fireEvent.click(dayCell(container, '2025-10-20')!.querySelector('button')!)

      expect(onSelect).toHaveBeenCalledTimes(1)
      const picked = onSelect.mock.calls[0][0] as Date
      expect(picked.getFullYear()).toBe(2025)
      expect(picked.getMonth()).toBe(9)
      expect(picked.getDate()).toBe(20)
    })

    it('marks the selected day as selected', () => {
      const { container } = render(
        <CalendarGrid
          selected={new Date(2025, 9, 15)}
          onSelect={() => {}}
          month={OCT_2025}
          onMonthChange={() => {}}
        />,
      )

      expect(container.querySelector('[data-selected-single="true"]')).toHaveAttribute(
        'data-day',
        // Calendar pins the react-day-picker locale (en via the next-intl mock).
        new Date(2025, 9, 15).toLocaleDateString('en'),
      )
    })
  })

  describe('today action', () => {
    it('selects today and jumps to its month', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2025, 10, 14, 9, 30)) // 14 Nov 2025
      const onSelect = vi.fn()
      const onMonthChange = vi.fn()

      render(
        <CalendarGrid
          month={OCT_2025}
          onMonthChange={onMonthChange}
          onSelect={onSelect}
          title="Workout Calendar"
          showTodayAction
          todayLabel="Today"
        />,
      )

      fireEvent.click(screen.getByRole('button', { name: 'Today' }))

      const selected = onSelect.mock.calls[0][0] as Date
      expect(selected.getFullYear()).toBe(2025)
      expect(selected.getMonth()).toBe(10)
      expect(selected.getDate()).toBe(14)

      // Month must land on the 1st so the grid shows today rather than a
      // mid-month scroll offset.
      const month = onMonthChange.mock.calls[0][0] as Date
      expect(month.getFullYear()).toBe(2025)
      expect(month.getMonth()).toBe(10)
      expect(month.getDate()).toBe(1)
    })

    it('omits the footer when no today action is requested', () => {
      render(<CalendarGrid month={OCT_2025} onMonthChange={() => {}} title="Meal Calendar" />)

      expect(screen.queryByRole('button', { name: 'Today' })).not.toBeInTheDocument()
      expect(document.querySelector('footer')).not.toBeInTheDocument()
    })

    it('omits the footer when a today action is requested without a label', () => {
      render(
        <CalendarGrid month={OCT_2025} onMonthChange={() => {}} title="Meal Calendar" showTodayAction />,
      )

      expect(screen.queryByRole('button', { name: 'Today' })).not.toBeInTheDocument()
    })
  })

  describe('controlled month', () => {
    it('displays the month it is given, not the real current month', () => {
      render(<CalendarGrid month={OCT_2025} onMonthChange={() => {}} title="Workout Calendar" />)

      expect(screen.getByText('October 2025')).toBeInTheDocument()
    })

    it('reports navigation when the month arrows are used', () => {
      const onMonthChange = vi.fn()
      render(<CalendarGrid month={OCT_2025} onMonthChange={onMonthChange} title="Workout Calendar" />)

      fireEvent.click(screen.getByRole('button', { name: /next month/i }))

      expect(onMonthChange).toHaveBeenCalledTimes(1)
    })
  })
})