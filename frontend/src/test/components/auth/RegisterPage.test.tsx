import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from '@/i18n/navigation'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import RegisterPage from '@/app/[locale]/(auth)/register/page'
import { authApi } from '@/lib/api'

// The page imports useRouter from '@/i18n/navigation' (the next-intl wrapper),
// not from 'next/navigation' — mocking the latter leaves push() unwired.
vi.mock('@/i18n/navigation', () => ({
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

const VALID = {
  username: 'newuser',
  email: 'newuser@example.com',
  password: 'password123',
  confirmPassword: 'password123',
  name: 'New User',
}

describe('RegisterPage', () => {
  function renderPage() {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    return render(
      <QueryClientProvider client={queryClient}>
        <RegisterPage />
      </QueryClientProvider>,
    )
  }

  const username = () => screen.getByLabelText(/username/i)
  const email = () => screen.getByRole('textbox', { name: /email/i })
  // `selector: 'input'` keeps these queries off the show/hide toggle buttons,
  // whose accessible names also contain "password".
  const password = () => screen.getByLabelText(/^password/i, { selector: 'input' })
  const confirmPassword = () =>
    screen.getByLabelText(/confirm password/i, { selector: 'input' })
  const name = () => screen.getByLabelText(/full name/i)
  const submit = () => screen.getByRole('button', { name: /create account/i })

  /**
   * The validation message belonging to a specific field.
   * `FieldInfo` renders a `role="alert"` sibling of the input inside the same
   * `Field` (role="group"), but does not wire `aria-describedby`, so the alert
   * has to be found by scoping to that group rather than from the document.
   */
  const errorFor = (field: HTMLElement) =>
    within(field.closest('[role="group"]') as HTMLElement).getByRole('alert')

  /** Fills every field the form validates on, so submit reaches `onSubmit`. */
  const fillValidForm = async (
    user: ReturnType<typeof userEvent.setup>,
    overrides: Partial<typeof VALID> = {},
  ) => {
    const values = { ...VALID, ...overrides }
    const fields: Array<[() => HTMLElement, string]> = [
      [username, values.username],
      [email, values.email],
      [password, values.password],
      [confirmPassword, values.confirmPassword],
      [name, values.name],
    ]

    for (const [field, value] of fields) {
      // userEvent.type() rejects an empty string; an empty field is the point
      // of the tests that override it with ''.
      if (value) await user.type(field(), value)
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
      ; vi.mocked(useRouter).mockReturnValue({ push: mockPush } as unknown as ReturnType<typeof useRouter>)
  })

  it('renders registration form with all fields', () => {
    renderPage()

    expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
    expect(email()).toBeInTheDocument()
    expect(password()).toBeInTheDocument()
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument()
    expect(name()).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /athlete/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /trainer/i })).toBeInTheDocument()
    expect(submit()).toBeInTheDocument()
    expect(screen.getByText(/already have an account/i)).toBeInTheDocument()
  })

  it('does not call register API when email format is invalid', async () => {
    const user = userEvent.setup()
    const registerMock = vi.mocked(authApi.register)
    renderPage()

    await fillValidForm(user, { email: 'invalid-email' })
    await user.click(submit())

    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument()
    })
    expect(registerMock).not.toHaveBeenCalled()
  })

  it('shows validation error when password is too short', async () => {
    const user = userEvent.setup()
    renderPage()

    await fillValidForm(user, { password: 'short', confirmPassword: 'short' })
    await user.click(submit())

    await waitFor(() => {
      // Matches the backend rule (swagger minLength: 8) and the field's own
      // "At least 8 characters" placeholder.
      expect(errorFor(password())).toHaveTextContent(/at least 8 characters/i)
    })
  })

  it('shows validation error when passwords do not match', async () => {
    const user = userEvent.setup()
    renderPage()

    await fillValidForm(user, { confirmPassword: 'password456' })
    await user.click(submit())

    await waitFor(() => {
      expect(errorFor(confirmPassword())).toHaveTextContent(/passwords do not match/i)
    })
  })

  it('shows validation error when name is empty', async () => {
    const user = userEvent.setup()
    renderPage()

    await fillValidForm(user, { name: '' })
    await user.click(submit())

    await waitFor(() => {
      // Exact match: /name is required/i also matches "Username is required".
      expect(errorFor(name())).toHaveTextContent('Name is required')
    })
  })

  it('shows validation error when username is empty', async () => {
    const user = userEvent.setup()
    renderPage()

    await fillValidForm(user, { username: '' })
    await user.click(submit())

    await waitFor(() => {
      expect(errorFor(username())).toHaveTextContent('Username is required')
    })
    expect(vi.mocked(authApi.register)).not.toHaveBeenCalled()
  })

  it('associates the validation message with the input', async () => {
    const user = userEvent.setup()
    renderPage()

    await fillValidForm(user, { name: '' })
    await user.click(submit())

    // The error renders as a role="alert" next to the input, but that alone
    // leaves the control with no description — aria-describedby is what ties
    // them together for screen readers.
    await waitFor(() => {
      const describedBy = name().getAttribute('aria-describedby')
      expect(describedBy).toBeTruthy()
      expect(document.getElementById(describedBy!)).toBe(errorFor(name()))
    })
  })

  it('allows role selection between athlete and trainer', async () => {
    const user = userEvent.setup()
    renderPage()

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
    vi.mocked(authApi.register).mockResolvedValue({ message: 'Success', userId: 1 })
    mockLogin.mockResolvedValue(undefined)

    renderPage()

    await fillValidForm(user)
    await user.click(submit())

    await waitFor(() => {
      expect(authApi.register).toHaveBeenCalledWith({
        username: VALID.username,
        email: VALID.email,
        password: VALID.password,
        role: 'athlete',
        profile: expect.objectContaining({ name: VALID.name }),
      })
    })
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith(VALID.email, VALID.password)
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })

  it('shows error message on registration failure', async () => {
    const user = userEvent.setup()
    vi.mocked(authApi.register).mockRejectedValue(new Error('Email already registered'))

    renderPage()

    await fillValidForm(user, { email: 'existing@example.com' })
    await user.click(submit())

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/email already registered/i)
    })
  })

  it('disables submit button and shows loading state during submission', async () => {
    const user = userEvent.setup()
    vi.mocked(authApi.register).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 200)),
    )
    mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 200)))

    renderPage()

    await fillValidForm(user)
    await user.click(submit())

    expect(screen.getByRole('button', { name: /creating account/i })).toBeDisabled()
  })
})
