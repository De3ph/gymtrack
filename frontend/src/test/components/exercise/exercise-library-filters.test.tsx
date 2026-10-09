import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ExerciseLibraryFilters } from '@/components/features/exercise/ExerciseLibraryFilters'
import type { Equipment, MuscleGroup } from '@/types'

const muscleGroups: MuscleGroup[] = [
  { id: 1, code: 'chest', description: 'Chest' },
  { id: 3, code: 'shoulders', description: 'Shoulders' },
]

const equipment: Equipment[] = [
  { id: 1, code: 'barbell', description: 'Barbell' },
  { id: 4, code: 'cable', description: 'Cable' },
]

const baseProps = {
  categories: ['strength', 'cardio'],
  muscleGroups,
  equipment,
  totalCount: 12,
  onChange: vi.fn(),
}

const renderFilters = (
  value: Parameters<typeof ExerciseLibraryFilters>[0]['value'],
  overrides: Partial<Parameters<typeof ExerciseLibraryFilters>[0]> = {},
) =>
  render(
    <ExerciseLibraryFilters
      {...baseProps}
      value={value}
      resultCount={value.muscleGroupId ? 4 : 12}
      {...overrides}
    />,
  )

describe('ExerciseLibraryFilters', () => {
  describe('selected value renders a label, not the raw key', () => {
    // Regression: Base UI's <Select.Value> resolves the trigger label by looking
    // the selected value up in the `items` array passed to <Select>. The options
    // themselves only exist inside a portal that is unmounted while the popup is
    // closed, so omitting `items` left nothing to resolve and the trigger printed
    // the raw value — "3" for Shoulders.
    //
    // The shared next-intl mock resolves a key to its last segment, so a
    // localised label renders as its code — 'shoulders', not the database's
    // English 'Shoulders'. That difference is what proves the resolver ran
    // instead of falling back to the description column.
    it('shows the muscle group label when one is selected', () => {
      renderFilters({ query: '', muscleGroupId: 3 })

      const trigger = screen.getByRole('combobox', {
        name: 'filter_muscle_group',
      })
      expect(trigger).toHaveTextContent('shoulders')
      // Neither the raw id nor the untranslated description.
      expect(trigger).not.toHaveTextContent('3')
      expect(trigger).not.toHaveTextContent('Shoulders')
    })

    it('shows the equipment label when one is selected', () => {
      renderFilters({ query: '', equipmentId: 4 })

      const trigger = screen.getByRole('combobox', { name: 'filter_equipment' })
      expect(trigger).toHaveTextContent('cable')
      expect(trigger).not.toHaveTextContent('4')
      expect(trigger).not.toHaveTextContent('Cable')
    })

    it('shows the category when one is selected', () => {
      renderFilters({ query: '', category: 'cardio' })

      const trigger = screen.getByRole('combobox', { name: 'filter_category' })
      expect(trigger).toHaveTextContent('cardio')
    })

    it('shows the all-filters label when nothing is selected', () => {
      renderFilters({ query: '' })

      expect(
        screen.getByRole('combobox', { name: 'filter_muscle_group' }),
      ).toHaveTextContent('all_muscle_groups')
      expect(
        screen.getByRole('combobox', { name: 'filter_equipment' }),
      ).toHaveTextContent('all_equipment')
      expect(
        screen.getByRole('combobox', { name: 'filter_category' }),
      ).toHaveTextContent('all_categories')
    })
  })

  describe('visible labels', () => {
    it('names every filter control on screen', () => {
      renderFilters({ query: '' })

      expect(screen.getByText('filter_search')).toBeInTheDocument()
      expect(screen.getByText('filter_category')).toBeInTheDocument()
      expect(screen.getByText('filter_muscle_group')).toBeInTheDocument()
      expect(screen.getByText('filter_equipment')).toBeInTheDocument()
    })

    it('wires the search label to its input so clicking the label focuses it', () => {
      renderFilters({ query: '' })

      expect(screen.getByLabelText('filter_search')).toHaveAttribute(
        'id',
        'exercise-library-search',
      )
    })

    it('names each select trigger for screen readers', () => {
      renderFilters({ query: '' })

      expect(
        screen.getByRole('combobox', { name: 'filter_muscle_group' }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('combobox', { name: 'filter_equipment' }),
      ).toBeInTheDocument()
    })
  })

  describe('layout', () => {
    // Regression: Select.Root renders no DOM element of its own, so a label and
    // trigger passed straight to it became siblings in the surrounding grid.
    // Three selects then contributed six grid children and the grid filled them
    // row-wise, stranding labels beside the wrong control. Each label must share
    // a parent with its own trigger.
    const cases = [
      { label: 'filter_category', trigger: 'filter_category' },
      { label: 'filter_muscle_group', trigger: 'filter_muscle_group' },
      { label: 'filter_equipment', trigger: 'filter_equipment' },
    ] as const

    it.each(cases)(
      '$label sits in the same container as its own trigger',
      ({ label, trigger }) => {
        renderFilters({ query: '' })

        const labelEl = screen.getByText(label)
        const triggerEl = screen.getByRole('combobox', { name: trigger })

        expect(labelEl.parentElement).toBe(triggerEl.parentElement)
      },
    )

    it('gives each select its own grid cell rather than one cell per element', () => {
      const { container } = render(
        <ExerciseLibraryFilters
          {...baseProps}
          value={{ query: '' }}
          resultCount={12}
        />,
      )

      // Find the grid by its column classes and count its direct children.
      // Six children here is the bug: it must be exactly three.
      const grid = container.querySelector('.sm\\:grid-cols-3')
      expect(grid).not.toBeNull()
      expect(grid!.children).toHaveLength(3)
    })

    it('does not use display:contents on the select wrapper', () => {
      // `contents` would satisfy the parent check above while still hoisting the
      // label and trigger into the grid as separate items, reproducing the
      // original visual bug. The wrapper has to establish its own box.
      renderFilters({ query: '' })

      const label = screen.getByText('filter_category')
      const wrapper = label.parentElement!

      expect(wrapper.tagName).toBe('DIV')
      expect(wrapper.className.split(/\s+/)).not.toContain('contents')
    })

    it('keeps the search field outside the select grid', () => {
      const { container } = render(
        <ExerciseLibraryFilters
          {...baseProps}
          value={{ query: '' }}
          resultCount={12}
        />,
      )

      const search = screen.getByLabelText('filter_search')
      const grid = container.querySelector('.sm\\:grid-cols-3')

      expect(grid!.contains(search)).toBe(false)
    })
  })

  describe('clear button', () => {
    it('is hidden when no filter is active', () => {
      renderFilters({ query: '' })

      expect(screen.queryByRole('button', { name: /clear_filters/ })).toBeNull()
    })

    it('appears when a filter is active', () => {
      renderFilters({ query: 'squat', muscleGroupId: 3 })

      expect(
        screen.getByRole('button', { name: /clear_filters/ }),
      ).toBeInTheDocument()
    })

    it('resets every filter, not just the search box', () => {
      const onChange = vi.fn()
      renderFilters(
        {
          query: 'squat',
          muscleGroupId: 3,
          equipmentId: 4,
          category: 'strength',
        },
        { onChange },
      )

      screen.getByRole('button', { name: /clear_filters/ }).click()

      expect(onChange).toHaveBeenCalledWith({ query: '' })
    })
  })

  describe('malformed lookup rows', () => {
    // swagger 2.x emits no `required` list, so id/code/description are all
    // optional in the generated types even though the database guarantees them.
    // A row with no id cannot be filtered on, and a row with no description
    // would otherwise render a blank trigger.
    it('drops a row with no id instead of offering the value "undefined"', () => {
      renderFilters(
        { query: '', muscleGroupId: 3 },
        {
          muscleGroups: [
            ...muscleGroups,
            { code: 'orphan', description: 'Orphan' } as MuscleGroup,
          ],
        },
      )

      expect(
        screen.getByRole('combobox', { name: 'filter_muscle_group' }),
      ).toHaveTextContent('shoulders')
    })

    it('falls back to the code when a description is blank', () => {
      renderFilters(
        { query: '', equipmentId: 7 },
        {
          equipment: [
            { id: 7, code: 'resistance_band', description: '' },
            ...equipment,
          ] as Equipment[],
        },
      )

      // Resolved from the code through the translation, never from the blank
      // description — a blank label would render an unusable option.
      const trigger = screen.getByRole('combobox', { name: 'filter_equipment' })
      expect(trigger).toHaveTextContent('resistance_band')
    })

    it('keeps the database description for a code with no translation', () => {
      renderFilters(
        { query: '', muscleGroupId: 9 },
        {
          muscleGroups: [
            ...muscleGroups,
            {
              id: 9,
              code: 'sternocleidomastoid',
              description: 'Sternocleidomastoid',
            },
          ] as MuscleGroup[],
        },
      )

      // An unmapped code must never surface as a raw dotted translation key.
      const trigger = screen.getByRole('combobox', { name: 'filter_muscle_group' })
      expect(trigger).toHaveTextContent('Sternocleidomastoid')
      expect(trigger).not.toHaveTextContent('muscle_groups')
    })

    it('folds hyphens in a stored code to the translation key', () => {
      renderFilters(
        { query: '', equipmentId: 8 },
        {
          equipment: [
            { id: 8, code: 'resistance-band', description: 'Band' },
          ] as Equipment[],
        },
      )

      // Seed data uses both 'resistance-band' and 'resistance_band'; both must
      // resolve to the same translation rather than one silently falling back.
      const trigger = screen.getByRole('combobox', { name: 'filter_equipment' })
      expect(trigger).toHaveTextContent('resistance_band')
      expect(trigger).not.toHaveTextContent('Band')
    })
  })
})