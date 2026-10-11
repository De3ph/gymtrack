import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DeleteAccountSection } from '@/app/[locale]/(dashboard)/profile/_components/DeleteAccountSection'

const mockPush = vi.fn()
const mockLogout = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) => {
    const state = { logout: mockLogout }
    return selector(state)
  },
}))

describe('DeleteAccountSection', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    mockLogout.mockResolvedValue(undefined)
    queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
    })
  })

  const renderWithProviders = (ui: React.ReactElement) =>
    render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)

  it('renders delete button', () => {
    renderWithProviders(<DeleteAccountSection />)
    expect(screen.getByRole('button', { name: 'Delete My Account' })).toBeInTheDocument()
  })

  it('opens dialog on button click', async () => {
    const user = userEvent.setup()
    renderWithProviders(<DeleteAccountSection />)

    await user.click(screen.getByRole('button', { name: 'Delete My Account' }))

    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    })
  })

  it('calls deleteAccount with password on confirm', async () => {
    const user = userEvent.setup()
    renderWithProviders(<DeleteAccountSection />)

    await user.click(screen.getByRole('button', { name: 'Delete My Account' }))

    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    })

    const passwordInput = screen.getByPlaceholderText('Enter current password')
    const dialog = screen.getByRole('alertdialog')
    const buttons = dialog.querySelectorAll('button')
    const confirmBtn = Array.from(buttons).find(
      (b) => b.textContent === 'Delete My Account'
    )!

    await user.type(passwordInput, 'correct123')
    await user.click(confirmBtn)

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled()
    })
  })

  it('shows error on wrong password', async () => {
    const user = userEvent.setup()
    renderWithProviders(<DeleteAccountSection />)

    await user.click(screen.getByRole('button', { name: 'Delete My Account' }))

    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    })

    const passwordInput = screen.getByPlaceholderText('Enter current password')
    const dialog = screen.getByRole('alertdialog')
    const buttons = dialog.querySelectorAll('button')
    const confirmBtn = Array.from(buttons).find(
      (b) => b.textContent === 'Delete My Account'
    )!

    await user.type(passwordInput, 'wrongpass')
    await user.click(confirmBtn)

    await waitFor(() => {
      expect(screen.getByText('invalid password')).toBeInTheDocument()
    })
  })
})
