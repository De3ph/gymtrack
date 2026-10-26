import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { ExerciseSetInput } from '@/components/features/workout/ExerciseSetInput'
import type { ExerciseSet } from '@/types'

const aSet = (overrides: Partial<ExerciseSet> = {}): ExerciseSet => ({
  weight: 0,
  weightUnit: 'kg',
  reps: 10,
  restTime: 60,
  ...overrides,
})

describe('ExerciseSetInput', () => {
  it('keeps a half-typed decimal in the field', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ExerciseSetInput value={[aSet()]} onChange={onChange} />)

    const weight = screen.getByLabelText('Weight')
    await user.clear(weight)
    await user.type(weight, '40.5')

    // The raw text is kept while the field is edited, so the decimal point
    // survives the keystroke that follows it. Without it the committed number
    // would be rounded back to 40 and the "5" would be appended to that.
    expect(weight).toHaveValue(40.5)
    expect(onChange.mock.calls.at(-1)?.[0][0].weight).toBe(40.5)
  })

  it('keeps an emptied field empty instead of putting the fallback back', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ExerciseSetInput value={[aSet()]} onChange={onChange} />)

    const weight = screen.getByLabelText('Weight')
    await user.clear(weight)

    // The model holds the fallback, but the field stays empty: a fallback put
    // back on screen would be appended to by the next keystroke.
    expect(weight).toHaveValue(null)
    expect(onChange.mock.calls.at(-1)?.[0][0].weight).toBe(0)
  })

  it('commits the typed number, so the validator can reject it', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ExerciseSetInput value={[aSet()]} onChange={onChange} />)

    const weight = screen.getByLabelText('Weight')
    await user.clear(weight)
    await user.type(weight, '-1')

    // A negative weight has to reach the schema: repairing it here would let
    // the workout through with a weight the athlete never typed.
    expect(onChange.mock.calls.at(-1)?.[0][0].weight).toBe(-1)
  })

  it('commits zero reps as zero', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ExerciseSetInput value={[aSet()]} onChange={onChange} />)

    const reps = screen.getByLabelText('Reps')
    await user.clear(reps)
    await user.type(reps, '0')

    // Zero reps is below the schema's minimum. Turning it into one here would
    // hide the error from the athlete.
    expect(onChange.mock.calls.at(-1)?.[0][0].reps).toBe(0)
  })

  it('keeps the rows apart when another row is added', async () => {
    const user = userEvent.setup()
    render(<ExerciseSetInput value={[aSet()]} onChange={vi.fn()} />)

    const add = screen.getByRole('button', { name: /add/i })
    await user.click(add)

    const weights = screen.getAllByLabelText('Weight')
    await user.clear(weights[1])
    await user.type(weights[1], '25')

    await user.click(add)

    const after = screen.getAllByLabelText('Weight')
    expect(after).toHaveLength(3)

    // A new row starts with the weight of the row above it, but the two rows
    // are separate: a colliding row id would make React reuse the row that
    // was just typed in, and the edit would land in both of them.
    await user.clear(after[1])
    await user.type(after[1], '30')

    const final = screen.getAllByLabelText('Weight')
    expect(final[1]).toHaveValue(30)
    expect(final[2]).toHaveValue(25)
  })

  it('defaults a new set to the working type', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ExerciseSetInput value={[aSet()]} onChange={onChange} />)

    const combos = screen.getAllByRole('combobox')
    expect(combos).toHaveLength(1)
    expect(combos[0]).toHaveTextContent('Working')

    await user.click(screen.getByRole('button', { name: /add/i }))

    const after = screen.getAllByRole('combobox')
    expect(after).toHaveLength(2)
    // The new row inherits the type of the row above it.
    expect(after[1]).toHaveTextContent('Working')
  })

  it('emits the selected set type', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ExerciseSetInput value={[aSet()]} onChange={onChange} />)

    await user.click(screen.getByRole('combobox'))
    await user.click(screen.getByRole('option', { name: 'Warm-up' }))

    expect(onChange.mock.calls.at(-1)?.[0][0].setType).toBe('warmup')
  })

  it('keeps the set type when a number field is edited', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <ExerciseSetInput
        value={[aSet({ setType: 'drop' })]}
        onChange={onChange}
      />,
    )

    const reps = screen.getByLabelText('Reps')
    await user.clear(reps)
    await user.type(reps, '8')

    const emitted = onChange.mock.calls.at(-1)?.[0][0]
    expect(emitted.setType).toBe('drop')
    expect(emitted.reps).toBe(8)
  })
})
