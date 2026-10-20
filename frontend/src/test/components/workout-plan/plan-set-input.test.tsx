import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { PlanSetInput } from '@/components/features/workout-plan/PlanSetInput'
import type { WorkoutPlanSet } from '@/types'

const aSet = (overrides: Partial<WorkoutPlanSet> = {}): WorkoutPlanSet => ({
  weight: 0,
  weightUnit: 'kg',
  reps: 20,
  restTime: 60,
  ...overrides,
})

describe('PlanSetInput', () => {
  it('commits at least one rep when the field is emptied and zero is typed', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<PlanSetInput value={[aSet()]} onChange={onChange} />)

    const reps = screen.getByLabelText('Reps')
    await user.clear(reps)
    await user.type(reps, '0')

    // The backend stores the value as it arrives, so a set of zero reps has
    // to be clamped before it leaves the field.
    expect(onChange.mock.calls.at(-1)?.[0][0].reps).toBe(1)
    expect(reps).toHaveValue(1)
  })

  it('keeps a half-typed decimal in the field', async () => {
    const user = userEvent.setup()
    render(<PlanSetInput value={[aSet()]} onChange={vi.fn()} />)

    const weight = screen.getByLabelText('Weight')
    await user.clear(weight)
    await user.type(weight, '40.5')

    // The raw text is kept while the field is edited, so the trailing digit
    // is appended to the number instead of to a rounded one.
    expect(weight).toHaveValue(40.5)
  })

  // The draft belongs to the number it was typed for. When the parent puts a
  // different number behind the row - a plan reloaded from the server, say -
  // the draft is stale, and keeping it would show a value the model does not
  // hold.
  it('drops a draft when the parent replaces the value behind it', async () => {
    const user = userEvent.setup()
    const { rerender } = render(
      <PlanSetInput value={[aSet()]} onChange={vi.fn()} />,
    )

    const reps = screen.getByLabelText('Reps')
    await user.clear(reps)
    await user.type(reps, '99')
    expect(reps).toHaveValue(99)

    // A new value array, as a parent that swapped the value would pass. The
    // field keeps its focus, so the draft is still there to be invalidated.
    rerender(<PlanSetInput value={[aSet({ reps: 20 })]} onChange={vi.fn()} />)

    expect(reps).toHaveValue(20)
  })
})
