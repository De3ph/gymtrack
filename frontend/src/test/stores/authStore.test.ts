import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAuthStore } from '@/stores/authStore'
import { authApi, userApi } from '@/lib/api'

// Mock API calls
vi.mock('@/lib/api', () => ({
  authApi: {
    login: vi.fn(),
  },
  userApi: {
    getCurrentUser: vi.fn(),
  },
}))

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('AuthStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset store state
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    })
  })

  it('should initialize with correct default state', () => {
    const state = useAuthStore.getState()

    expect(state.user).toBeNull()
    expect(state.token).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.isLoading).toBe(true) // Initial loading state
  })

  it('should login successfully and set auth state', async () => {
    const mockUser = {
      userId: 'user-1',
      email: 'test@example.com',
      role: 'athlete' as const,
      profile: {
        name: 'Test User',
        age: 25,
        weight: 70,
        height: 175,
        fitnessGoals: 'Build muscle',
      },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    }

    const mockToken = 'mock-jwt-token'

    vi.mocked(authApi.login).mockResolvedValue({ message: 'Login successful', token: mockToken })
    vi.mocked(userApi.getCurrentUser).mockResolvedValue(mockUser)

    const { login } = useAuthStore.getState()
    await login('test@example.com', 'password123')

    expect(authApi.login).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    })
    expect(localStorageMock.setItem).toHaveBeenCalledWith('token', mockToken)
    expect(userApi.getCurrentUser).toHaveBeenCalled()

    const state = useAuthStore.getState()
    expect(state.token).toBe(mockToken)
    expect(state.user).toEqual(mockUser)
    expect(state.isAuthenticated).toBe(true)
    expect(state.isLoading).toBe(false)
  })

  it('should handle login failure', async () => {
    const error = new Error('Invalid credentials')
    vi.mocked(authApi.login).mockRejectedValue(error)

    const { login } = useAuthStore.getState()

    await expect(login('test@example.com', 'wrongpassword')).rejects.toThrow('Invalid credentials')

    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.token).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.isLoading).toBe(false)
  })

  it('should logout and clear auth state', () => {
    // Set some initial state
    useAuthStore.setState({
      user: { userId: 'user-1' } as any,
      token: 'some-token',
      isAuthenticated: true,
      isLoading: false,
    })

    const { logout } = useAuthStore.getState()
    logout()

    expect(localStorageMock.removeItem).toHaveBeenCalledWith('token')

    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.token).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.isLoading).toBe(false)
  })

  it('should initialize auth from localStorage token', async () => {
    const mockUser = {
      userId: 'user-1',
      email: 'test@example.com',
      role: 'athlete' as const,
      profile: {
        name: 'Test User',
      },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    }

    localStorageMock.getItem.mockReturnValue('existing-token')
    vi.mocked(userApi.getCurrentUser).mockResolvedValue(mockUser)

    const { initializeAuth } = useAuthStore.getState()
    await initializeAuth()

    expect(localStorageMock.getItem).toHaveBeenCalledWith('token')
    expect(userApi.getCurrentUser).toHaveBeenCalled()

    const state = useAuthStore.getState()
    expect(state.token).toBe('existing-token')
    expect(state.user).toEqual(mockUser)
    expect(state.isAuthenticated).toBe(true)
    expect(state.isLoading).toBe(false)
  })

  it('should handle missing token during initialization', async () => {
    localStorageMock.getItem.mockReturnValue(null)

    const { initializeAuth } = useAuthStore.getState()
    await initializeAuth()

    expect(userApi.getCurrentUser).not.toHaveBeenCalled()

    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.token).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.isLoading).toBe(false)
  })

  it('should handle auth error during initialization', async () => {
    localStorageMock.getItem.mockReturnValue('invalid-token')
    vi.mocked(userApi.getCurrentUser).mockRejectedValue(new Error('Unauthorized'))

    const { initializeAuth } = useAuthStore.getState()
    await initializeAuth()

    expect(localStorageMock.removeItem).toHaveBeenCalledWith('token')

    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.token).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.isLoading).toBe(false)
  })

  it('should update user state', () => {
    const mockUser = {
      userId: 'user-1',
      email: 'test@example.com',
      role: 'athlete' as const,
      profile: {
        name: 'Updated User',
      },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    }

    const { setUser } = useAuthStore.getState()
    setUser(mockUser)

    const state = useAuthStore.getState()
    expect(state.user).toEqual(mockUser)
  })

  it('should handle auth error with 401 status', () => {
    // Set initial authenticated state
    useAuthStore.setState({
      user: { userId: 'user-1' } as any,
      token: 'some-token',
      isAuthenticated: true,
      isLoading: false,
    })

    const error = new Error('401 Unauthorized')

    const { handleAuthError } = useAuthStore.getState()
    handleAuthError(error)

    expect(localStorageMock.removeItem).toHaveBeenCalledWith('token')

    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.token).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.isLoading).toBe(false)
  })

  it('should handle non-auth related errors', () => {
    const error = new Error('Network error')

    const { handleAuthError } = useAuthStore.getState()
    handleAuthError(error)

    expect(localStorageMock.removeItem).not.toHaveBeenCalled()

    const state = useAuthStore.getState()
    expect(state.isLoading).toBe(false)
    // Other state should remain unchanged
  })
})
