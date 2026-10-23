import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ExerciseLibraryFilters } from '@/components/features/exercise/ExerciseLibraryFilters'
import type { Equipment, MuscleGroup } from '@/types'

// Descriptions are deliberately different from the English translation
// ("Shoulders", "Cable", ...) so a test can prove which of the two rendered.
const muscleGroups: MuscleGroup[] = [
  { id: 1, code: 'chest', description: 'Pecs' },
  { id: 3, code: 'shoulders', description: 'Deltoids' },
]

const equipment: Equipment[] = [
  { id: 1, code: 'barbell', description: 'Bar' },
  { id: 4, code: 'cable', description: 'Pulley' },
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
    // Resolution order is translation first, database description second, so the
    // fixtures above carry descriptions ("Deltoids", "Pulley") that differ from
    // the English translation. Seeing the translation proves the resolver ran
    // instead of falling back to the description column.
    it('shows the muscle group label when one is selected', () => {
      renderFilters({ query: '', muscleGroupId: 3 })

      const trigger = screen.getByRole('combobox', {
        name: 'Muscle Group',
      })
      expect(trigger).toHaveTextContent('Shoulders')
      // Neither the raw id nor the untranslated description.
      expect(trigger).not.toHaveTextContent('3')
      expect(trigger).not.toHaveTextContent('Deltoids')
    })

    it('shows the equipment label when one is selected', () => {
      renderFilters({ query: '', equipmentId: 4 })

      const trigger = screen.getByRole('combobox', { name: 'Equipment' })
      expect(trigger).toHaveTextContent('Cable')
      expect(trigger).not.toHaveTextContent('4')
      expect(trigger).not.toHaveTextContent('Pulley')
    })

    it('shows the category when one is selected', () => {
      renderFilters({ query: '', category: 'cardio' })

      const trigger = screen.getByRole('combobox', { name: 'Category' })
      expect(trigger).toHaveTextContent('cardio')
    })

    it('shows the all-filters label when nothing is selected', () => {
      renderFilters({ query: '' })

      expect(
        screen.getByRole('combobox', { name: 'Muscle Group' }),
      ).toHaveTextContent('All Muscle Groups')
      expect(
        screen.getByRole('combobox', { name: 'Equipment' }),
      ).toHaveTextContent('All Equipment')
      expect(
        screen.getByRole('combobox', { name: 'Category' }),
      ).toHaveTextContent('All Categories')
    })
  })

  describe('visible labels', () => {
    it('names every filter control on screen', () => {
      renderFilters({ query: '' })

      // The search field has no visible label; its accessible name is enough.
      expect(screen.getByRole('searchbox', { name: 'Search' })).toBeInTheDocument()
      expect(screen.getByText('Category')).toBeInTheDocument()
      expect(screen.getByText('Muscle Group')).toBeInTheDocument()
      expect(screen.getByText('Equipment')).toBeInTheDocument()
    })

    it('wires the search label to its input so clicking the label focuses it', () => {
      renderFilters({ query: '' })

      expect(screen.getByLabelText('Search')).toHaveAttribute(
        'id',
        'exercise-library-search',
      )
    })

    it('names each select trigger for screen readers', () => {
      renderFilters({ query: '' })

      expect(
        screen.getByRole('combobox', { name: 'Muscle Group' }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('combobox', { name: 'Equipment' }),
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
      { label: 'Category', trigger: 'Category' },
      { label: 'Muscle Group', trigger: 'Muscle Group' },
      { label: 'Equipment', trigger: 'Equipment' },
    ] as const

    it.each(cases)(
      '$label shares a container with its own trigger',
      ({ label, trigger }) => {
        renderFilters({ query: '' })

        const labelEl = screen.getByText(label)
        const triggerEl = screen.getByRole('combobox', { name: trigger })

        // The label and trigger are deliberate siblings inside the select's
        // cell wrapper; the trigger additionally sits in a position:relative
        // box so the clear button can overlay it.
        expect(labelEl.parentElement).toContainElement(triggerEl)
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

      const label = screen.getByText('Category')
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

      const search = screen.getByLabelText('Search')
      const grid = container.querySelector('.sm\\:grid-cols-3')

      expect(grid!.contains(search)).toBe(false)
    })
  })

  describe('clear button', () => {
    it('is hidden when no filter is active', () => {
      renderFilters({ query: '' })

      expect(screen.queryByRole('button', { name: /clear filters/i })).toBeNull()
    })

    it('appears when a filter is active', () => {
      renderFilters({ query: 'squat', muscleGroupId: 3 })

      expect(
        screen.getByRole('button', { name: /clear filters/i }),
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

      screen.getByRole('button', { name: /clear filters/i }).click()

      expect(onChange).toHaveBeenCalledWith({ query: '' })
    })
  })

  describe('per-filter clear button', () => {
    it('is absent for a filter with no selection', () => {
      renderFilters({ query: '' })

      expect(
        screen.queryByRole('button', { name: 'Clear selection' }),
      ).toBeNull()
    })

    it('clears only its own filter', () => {
      const onChange = vi.fn()
      renderFilters(
        { query: '', muscleGroupId: 3, equipmentId: 4 },
        { onChange },
      )

      const clearButtons = screen.getAllByRole('button', {
        name: 'Clear selection',
      })
      expect(clearButtons).toHaveLength(2)

      clearButtons[0].click()

      expect(onChange).toHaveBeenCalledWith({
        query: '',
        muscleGroupId: undefined,
        equipmentId: 4,
      })
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
        screen.getByRole('combobox', { name: 'Muscle Group' }),
      ).toHaveTextContent('Shoulders')
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
      const trigger = screen.getByRole('combobox', { name: 'Equipment' })
      expect(trigger).toHaveTextContent('Resistance Band')
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
      const trigger = screen.getByRole('combobox', { name: 'Muscle Group' })
      expect(trigger).toHaveTextContent('Sternocleidomastoid')
      expect(trigger).not.toHaveTextContent('muscle_groups')
    })

    it('folds hyphens in a stored code to the translation key', () => {
      renderFilters(
        { query: '', equipmentId: 8 },
        {
          equipment: [
            { id: 8, code: 'resistance-band', description: 'Elastic strap' },
          ] as Equipment[],
        },
      )

      // Seed data uses both 'resistance-band' and 'resistance_band'; both must
      // resolve to the same translation rather than one silently falling back.
      const trigger = screen.getByRole('combobox', { name: 'Equipment' })
      expect(trigger).toHaveTextContent('Resistance Band')
      expect(trigger).not.toHaveTextContent('Elastic strap')
    })
  })
})
