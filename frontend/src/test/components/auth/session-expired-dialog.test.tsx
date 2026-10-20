import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { SessionExpiredDialog } from '@/components/features/auth/session-expired-dialog'
import { notifySessionExpired, clearSessionExpiryNotice } from '@/lib/session-expiry'
import { useAuthStore } from '@/stores/authStore'

const mockLogout = vi.fn()

vi.mock('@/lib/hooks/useLogout', () => ({
  useLogout: () => ({ logout: mockLogout }),
}))

describe('SessionExpiredDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLogout.mockResolvedValue(undefined)
    // The notice is latched until a session is (re-)established.
    clearSessionExpiryNotice()
    useAuthStore.setState({ isAuthenticated: true })
  })

  afterEach(() => {
    useAuthStore.setState({ isAuthenticated: false })
  })

  it('stays closed while the session is alive', () => {
    render(<SessionExpiredDialog />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens with an explanation and a logout button when the session expires', async () => {
    render(<SessionExpiredDialog />)

    notifySessionExpired()

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(screen.getByText(/session expired/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument()
  })

  it('stays closed when there is no session to log out of', async () => {
    useAuthStore.setState({ isAuthenticated: false })
    render(<SessionExpiredDialog />)

    notifySessionExpired()

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('logs out when the logout button in the footer is pressed', async () => {
    const user = userEvent.setup()
    render(<SessionExpiredDialog />)

    notifySessionExpired()
    await screen.findByRole('dialog')

    await user.click(screen.getByRole('button', { name: /logout/i }))

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalledTimes(1)
    })
  })

  it('logs out when the modal is closed', async () => {
    const user = userEvent.setup()
    render(<SessionExpiredDialog />)

    notifySessionExpired()
    await screen.findByRole('dialog')

    // The close button of the dialog chrome (X) dismisses the modal.
    await user.click(screen.getByRole('button', { name: /close/i }))

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalledTimes(1)
    })
  })

  it('does not log out when the user clicks outside the modal', async () => {
    const user = userEvent.setup()
    render(<SessionExpiredDialog />)

    notifySessionExpired()
    await screen.findByRole('dialog')

    // Pointer dismissal is disabled: a stray click must not end the session.
    await user.click(document.body)

    expect(mockLogout).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('logs out only once when the modal is closed after pressing logout', async () => {
    const user = userEvent.setup()
    render(<SessionExpiredDialog />)

    notifySessionExpired()
    await screen.findByRole('dialog')

    await user.click(screen.getByRole('button', { name: /logout/i }))
    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalledTimes(1)
    })

    await user.keyboard('{Escape}')

    expect(mockLogout).toHaveBeenCalledTimes(1)
  })
})
