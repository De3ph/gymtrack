import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import RegisterPage from '@/app/(auth)/register/page'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}))

const mockPush = vi.fn()
const mockLogin = vi.fn()
vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({ login: mockLogin }),
}))

vi.mock('@/lib/api', () => ({
  authApi: {
    register: vi.fn(),
  },
}))

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(useRouter as any).mockReturnValue({ push: mockPush })
  })

  it('renders registration form with all fields', () => {
    render(<RegisterPage />)

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument()
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /athlete/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /trainer/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument()
    expect(screen.getByText(/already have an account/i)).toBeInTheDocument()
  })

  it('does not call register API when email format is invalid', async () => {
    const user = userEvent.setup()
    const registerMock = vi.mocked(authApi.register)
    render(<RegisterPage />)

    await user.type(screen.getByRole('textbox', { name: /email/i }), 'invalid-email')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.type(screen.getByLabelText('Confirm Password'), 'password123')
    await user.type(screen.getByLabelText(/full name/i), 'Test User')
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => {
      expect(registerMock).not.toHaveBeenCalled()
    })
  })

  it('shows validation error when password is too short', async () => {
    const user = userEvent.setup()
    render(<RegisterPage />)

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/^password/i), 'short')
    await user.type(screen.getByLabelText(/confirm password/i), 'short')
    await user.type(screen.getByLabelText(/full name/i), 'Test User')
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => {
      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument()
    })
  })

  it('shows validation error when passwords do not match', async () => {
    const user = userEvent.setup()
    render(<RegisterPage />)

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/^password/i), 'password123')
    await user.type(screen.getByLabelText(/confirm password/i), 'password456')
    await user.type(screen.getByLabelText(/full name/i), 'Test User')
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => {
      expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument()
    })
  })

  it('shows validation error when name is empty', async () => {
    const user = userEvent.setup()
    render(<RegisterPage />)

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/^password/i), 'password123')
    await user.type(screen.getByLabelText(/confirm password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument()
    })
  })

  it('allows role selection between athlete and trainer', async () => {
    const user = userEvent.setup()
    render(<RegisterPage />)

    const athleteRadio = screen.getByRole('radio', { name: /athlete/i })
    const trainerRadio = screen.getByRole('radio', { name: /trainer/i })

    expect(athleteRadio).toBeChecked()
    await user.click(trainerRadio)
    expect(trainerRadio).toBeChecked()
    await user.click(athleteRadio)
    expect(athleteRadio).toBeChecked()
  })

  it('submits form with valid data and redirects after success', async () => {
    const user = userEvent.setup()
    vi.mocked(authApi.register).mockResolvedValue(undefined)
    mockLogin.mockResolvedValue(undefined)

    render(<RegisterPage />)

    await user.type(screen.getByLabelText(/email/i), 'newuser@example.com')
    await user.type(screen.getByLabelText(/^password/i), 'password123')
    await user.type(screen.getByLabelText(/confirm password/i), 'password123')
    await user.type(screen.getByLabelText(/full name/i), 'New User')
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => {
      expect(authApi.register).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: 'password123',
        role: 'athlete',
        profile: expect.objectContaining({ name: 'New User' }),
      })
    })
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('newuser@example.com', 'password123')
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })

  it('shows error message on registration failure', async () => {
    const user = userEvent.setup()
    vi.mocked(authApi.register).mockRejectedValue(new Error('Email already registered'))

    render(<RegisterPage />)

    await user.type(screen.getByLabelText(/email/i), 'existing@example.com')
    await user.type(screen.getByLabelText(/^password/i), 'password123')
    await user.type(screen.getByLabelText(/confirm password/i), 'password123')
    await user.type(screen.getByLabelText(/full name/i), 'Test User')
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => {
      expect(screen.getByText(/email already registered/i)).toBeInTheDocument()
    })
  })

  it('disables submit button and shows loading state during submission', async () => {
    const user = userEvent.setup()
    vi.mocked(authApi.register).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 200))
    )
    mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 200)))

    render(<RegisterPage />)

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/^password/i), 'password123')
    await user.type(screen.getByLabelText(/confirm password/i), 'password123')
    await user.type(screen.getByLabelText(/full name/i), 'Test User')
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    expect(screen.getByRole('button', { name: /creating account/i })).toBeDisabled()
  })
})
