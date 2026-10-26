import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { SetTypeBadge } from '@/components/features/workout/SetTypeBadge'
import { SetTypeSelect } from '@/components/features/workout/SetTypeSelect'
import type { SetType } from '@/types'

describe('SetTypeBadge', () => {
  it('renders nothing for the working default', () => {
    const { container } = render(<SetTypeBadge />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing for an explicit working type', () => {
    const { container } = render(<SetTypeBadge type="working" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders a label for non-working types', () => {
    render(<SetTypeBadge type="warmup" />)
    expect(screen.getByTestId('set-type-badge')).toHaveTextContent('Warm-up')
  })

  const labelled: Array<[SetType, string]> = [
    ['warmup', 'Warm-up'],
    ['backoff', 'Backoff'],
    ['drop', 'Drop'],
  ]
  it.each(labelled)('labels %s', (type, label) => {
    render(<SetTypeBadge type={type} />)
    expect(screen.getByTestId('set-type-badge')).toHaveTextContent(label)
  })
})

describe('SetTypeSelect', () => {
  const trigger = () => screen.getByRole('combobox', { name: /set type/i })

  it('offers the four set types', async () => {
    const user = userEvent.setup()
    render(<SetTypeSelect value="working" onChange={vi.fn()} />)

    await user.click(trigger())

    expect(screen.getByRole('option', { name: 'Warm-up' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Working' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Backoff' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Drop' })).toBeInTheDocument()
  })

  it('shows the current type as the trigger value', () => {
    render(<SetTypeSelect value="drop" onChange={vi.fn()} />)
    expect(trigger()).toHaveTextContent('Drop')
  })

  it('fires onChange with the selected type', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SetTypeSelect value="working" onChange={onChange} />)

    await user.click(trigger())
    await user.click(screen.getByRole('option', { name: 'Warm-up' }))

    expect(onChange).toHaveBeenCalledWith('warmup')
  })
})