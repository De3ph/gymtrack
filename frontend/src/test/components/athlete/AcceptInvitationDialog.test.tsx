import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { AcceptInvitationDialog } from '@/components/features/athlete/AcceptInvitationDialog'
import { relationshipApi } from '@/lib/api'

vi.mock('@/lib/api', () => ({
  relationshipApi: {
    acceptInvitation: vi.fn(),
  },
}))

describe('AcceptInvitationDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders trigger button to open dialog', () => {
    render(<AcceptInvitationDialog />)

    expect(screen.getByRole('button', { name: /connect with trainer/i })).toBeInTheDocument()
  })

  it('opens dialog when trigger is clicked', async () => {
    const user = userEvent.setup()
    render(<AcceptInvitationDialog />)

    await user.click(screen.getByRole('button', { name: /connect with trainer/i }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/8-character code/i)).toBeInTheDocument()
  })

  it('validates invitation code must be exactly 8 alphanumeric characters', async () => {
    const user = userEvent.setup()
    render(<AcceptInvitationDialog />)

    await user.click(screen.getByRole('button', { name: /connect with trainer/i }))

    const dialog = screen.getByRole('dialog')
    const input = within(dialog).getByPlaceholderText(/8-character code/i)
    await user.type(input, 'short')
    const submitBtn = within(dialog).getByRole('button', { name: /connect with trainer/i })
    expect(submitBtn).toBeDisabled()

    await user.clear(input)
    await user.type(input, '12345678')
    await waitFor(() => {
      expect(submitBtn).not.toBeDisabled()
    })
  })

  it('sanitizes input to alphanumeric only', async () => {
    const user = userEvent.setup()
    render(<AcceptInvitationDialog />)

    await user.click(screen.getByRole('button', { name: /connect with trainer/i }))

    const dialog = screen.getByRole('dialog')
    const input = within(dialog).getByPlaceholderText(/8-character code/i)
    await user.type(input, 'a1-b2-c3!')
    expect(input).toHaveValue('a1b2c3')
  })

  it('disables submit when code is not exactly 8 characters', async () => {
    const user = userEvent.setup()
    render(<AcceptInvitationDialog />)

    await user.click(screen.getByRole('button', { name: /connect with trainer/i }))
    const dialog = screen.getByRole('dialog')
    const input = within(dialog).getByPlaceholderText(/8-character code/i)
    await user.type(input, '7chars')
    const submitBtn = within(dialog).getByRole('button', { name: /connect with trainer/i })
    expect(submitBtn).toBeDisabled()
  })

  it('shows success state when invitation accepted', async () => {
    const user = userEvent.setup()
    vi.mocked(relationshipApi.acceptInvitation).mockResolvedValue(undefined)

    render(<AcceptInvitationDialog />)

    await user.click(screen.getByRole('button', { name: /connect with trainer/i }))
    const dialog = screen.getByRole('dialog')
    const input = within(dialog).getByPlaceholderText(/8-character code/i)
    await user.type(input, 'abcdefgh')
    await user.click(within(dialog).getByRole('button', { name: /connect with trainer/i }))

    await waitFor(() => {
      expect(relationshipApi.acceptInvitation).toHaveBeenCalledWith('abcdefgh')
    })
    await waitFor(() => {
      expect(screen.getByText(/successfully connected/i)).toBeInTheDocument()
    })
  })

  it('shows error message when API fails', async () => {
    const user = userEvent.setup()
    vi.mocked(relationshipApi.acceptInvitation).mockRejectedValue(new Error('Invalid or expired code'))

    render(<AcceptInvitationDialog />)

    await user.click(screen.getByRole('button', { name: /connect with trainer/i }))
    const dialog = screen.getByRole('dialog')
    const input = within(dialog).getByPlaceholderText(/8-character code/i)
    await user.type(input, 'abcdefgh')
    await user.click(within(dialog).getByRole('button', { name: /connect with trainer/i }))

    await waitFor(() => {
      expect(screen.getByText(/invalid or expired code/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('shows loading state during submission', async () => {
    const user = userEvent.setup()
    let resolveSubmit: () => void
    vi.mocked(relationshipApi.acceptInvitation).mockImplementation(
      () => new Promise(resolve => { resolveSubmit = resolve })
    )

    render(<AcceptInvitationDialog />)

    await user.click(screen.getByRole('button', { name: /connect with trainer/i }))
    const dialog = screen.getByRole('dialog')
    const input = within(dialog).getByPlaceholderText(/8-character code/i)
    await user.type(input, 'abcdefgh')
    await user.click(within(dialog).getByRole('button', { name: /connect with trainer/i }))

    expect(screen.getByText(/connecting/i)).toBeInTheDocument()
    resolveSubmit!()
  })
})
