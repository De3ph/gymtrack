import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAuthStore } from '@/stores/authStore'
import { authApi, userApi } from '@/lib/api'
import { tokenService } from '@/lib/token-service'
import { server } from '@/test/mocks/server'
import { http, HttpResponse } from 'msw'

vi.mock('@/lib/api', () => ({
  authApi: {
    login: vi.fn(),
    logout: vi.fn().mockResolvedValue({ message: 'Logged out' }),
  },
  userApi: {
    getCurrentUser: vi.fn(),
  },
}))

describe('AuthStore', () => {
  beforeEach(() => {
    server.use(
      http.post('/api/auth/session', () =>
        HttpResponse.json({ success: true })
      ),
      http.get('/api/auth/session', () =>
        HttpResponse.json({ accessToken: 'session-recovered-token', refreshToken: 'session-refresh-token', userId: 'user-1', role: 'athlete' })
      ),
      http.delete('/api/auth/session', () =>
        HttpResponse.json({ success: true })
      ),
    )
  })

  beforeEach(() => {
    vi.clearAllMocks()
    tokenService.remove()
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,
      isInitialized: false,
    })
  })

  it('should initialize with correct default state', () => {
    const state = useAuthStore.getState()

    expect(state.user).toBeNull()
    expect(state.token).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.isLoading).toBe(true)
  })

  it('should login successfully and set auth state', async () => {
    const mockUser = {
      userId: 1,
      username: 'testuser',
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

    vi.mocked(authApi.login).mockResolvedValue({
      message: 'Login successful',
      accessToken: mockToken,
      refreshToken: 'refresh-token',
      user: mockUser,
    })

    const { login } = useAuthStore.getState()
    await login('test@example.com', 'password123')

    expect(authApi.login).toHaveBeenCalledWith({
      identifier: 'test@example.com',
      password: 'password123',
    })

    expect(tokenService.getAccessToken()).toBe(mockToken)

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

  it('should logout and clear auth state', async () => {
    tokenService.setTokens('some-token', 'refresh-token')
    useAuthStore.setState({
      user: { userId: 'user-1' } as any,
      token: 'some-token',
      isAuthenticated: true,
      isLoading: false,
    })

    const { logout } = useAuthStore.getState()
    await logout()

    // In-memory tokens cleared
    expect(tokenService.getAccessToken()).toBeNull()

    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.token).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.isLoading).toBe(false)
    expect(state.isInitialized).toBe(true)
  })

  it('should initialize auth from session cookie', async () => {
    const mockUser = {
      userId: 1,
      username: 'testuser',
      email: 'test@example.com',
      role: 'athlete' as const,
      profile: {
        name: 'Test User',
      },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    }

    vi.mocked(userApi.getCurrentUser).mockResolvedValue(mockUser)

    const { initializeAuth } = useAuthStore.getState()
    await initializeAuth()

    expect(tokenService.getAccessToken()).toBe('session-recovered-token')
    expect(tokenService.getRefreshToken()).toBe('session-refresh-token')
    expect(userApi.getCurrentUser).toHaveBeenCalled()

    const state = useAuthStore.getState()
    expect(state.token).toBe('session-recovered-token')
    expect(state.user).toEqual(mockUser)
    expect(state.isAuthenticated).toBe(true)
    expect(state.isLoading).toBe(false)
  })

  it('should handle missing session during initialization', async () => {
    server.use(
      http.get('/api/auth/session', () =>
        HttpResponse.json({ accessToken: null, user: null })
      ),
    )

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
    vi.mocked(userApi.getCurrentUser).mockRejectedValue(new Error('Unauthorized'))

    const { initializeAuth } = useAuthStore.getState()
    await initializeAuth()

    // In-memory tokens cleared
    expect(tokenService.getAccessToken()).toBeNull()

    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.token).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.isLoading).toBe(false)
  })

  it('should update user state', () => {
    const mockUser = {
      userId: 1,
      username: 'testuser',
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
    tokenService.setTokens('some-token', 'refresh-token')
    useAuthStore.setState({
      user: { userId: 1 } as any,
      token: 'some-token',
      isAuthenticated: true,
      isLoading: false,
    })

    const error = new Error('401 Unauthorized')

    const { handleAuthError } = useAuthStore.getState()
    handleAuthError(error)

    expect(tokenService.getAccessToken()).toBeNull()

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

    const state = useAuthStore.getState()
    expect(state.isLoading).toBe(false)
  })
})
