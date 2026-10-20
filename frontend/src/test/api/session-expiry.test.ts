import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import api, { ApiError } from '@/lib/api/api-client'
import { tokenService } from '@/lib/token-service'
import { subscribeSessionExpired, clearSessionExpiryNotice } from '@/lib/session-expiry'

const { mockRefreshTokens } = vi.hoisted(() => ({ mockRefreshTokens: vi.fn() }))

// The API client reaches the refresh through lib/auth-refresh (a standalone
// module, so that the auth store does not have to be imported by the API
// layer).
vi.mock('@/lib/auth-refresh', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth-refresh')>()
  return {
    ...actual,
    refreshTokens: mockRefreshTokens,
  }
})

describe('api-client session expiry', () => {
  let expiredCount: number
  let unsubscribe: () => void

  beforeEach(() => {
    vi.clearAllMocks()
    expiredCount = 0
    unsubscribe = subscribeSessionExpired(() => {
      expiredCount += 1
    })
    // The notice is latched until a session is (re-)established.
    clearSessionExpiryNotice()
    mockRefreshTokens.mockResolvedValue('rejected')
  })

  afterEach(() => {
    unsubscribe()
    tokenService.remove()
  })

  it('announces the session is over when the refresh token is rejected', async () => {
    tokenService.setTokens('expired-access-token', 'refresh-token')
    server.use(
      http.get('/api/workouts', () =>
        HttpResponse.json({ error: 'Your session token is invalid or expired.' }, { status: 401 })
      )
    )

    await expect(api.get('/workouts')).rejects.toBeInstanceOf(ApiError)

    expect(mockRefreshTokens).toHaveBeenCalledTimes(1)
    expect(expiredCount).toBe(1)
  })

  it('keeps the HTTP status on the thrown error', async () => {
    tokenService.setTokens('expired-access-token', 'refresh-token')
    server.use(
      http.get('/api/workouts', () =>
        HttpResponse.json({ error: 'Your session token is invalid or expired.' }, { status: 401 })
      )
    )

    await expect(api.get('/workouts')).rejects.toMatchObject({ status: 401 })
  })

  it('does not announce expiry when the request carried no token', async () => {
    server.use(
      http.get('/api/workouts', () =>
        HttpResponse.json({ error: 'Authorization header is required.' }, { status: 401 })
      )
    )

    await expect(api.get('/workouts')).rejects.toBeInstanceOf(ApiError)

    expect(mockRefreshTokens).not.toHaveBeenCalled()
    expect(expiredCount).toBe(0)
  })

  it('does not announce expiry for the auth endpoints', async () => {
    tokenService.setTokens('access-token', 'refresh-token')
    server.use(
      http.post('/api/auth/login', () =>
        HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 })
      )
    )

    await expect(api.post('/auth/login', {})).rejects.toBeInstanceOf(ApiError)

    expect(expiredCount).toBe(0)
  })

  it('replays the request after a successful refresh and stays quiet', async () => {
    tokenService.setTokens('expired-access-token', 'refresh-token')
    let calls = 0
    server.use(
      http.get('/api/workouts', () => {
        calls += 1
        if (calls === 1) {
          return HttpResponse.json({ error: 'expired' }, { status: 401 })
        }
        return HttpResponse.json({ workouts: [], count: 0 })
      })
    )

    mockRefreshTokens.mockImplementation(async () => {
      tokenService.setTokens('fresh-access-token', 'refresh-token')
      return 'refreshed'
    })

    await expect(api.get('/workouts')).resolves.toEqual({ workouts: [], count: 0 })

    expect(calls).toBe(2)
    expect(expiredCount).toBe(0)
  })

  it('announces expiry only once when the replay fails with 401 again', async () => {
    tokenService.setTokens('expired-access-token', 'refresh-token')
    let calls = 0
    server.use(
      http.get('/api/workouts', () => {
        calls += 1
        return HttpResponse.json({ error: 'expired' }, { status: 401 })
      })
    )

    mockRefreshTokens.mockImplementation(async () => {
      tokenService.setTokens('fresh-access-token', 'refresh-token')
      return 'refreshed'
    })

    await expect(api.get('/workouts')).rejects.toBeInstanceOf(ApiError)

    // The request is replayed exactly once — no refresh/retry loop.
    expect(calls).toBe(2)
    expect(mockRefreshTokens).toHaveBeenCalledTimes(1)
    expect(expiredCount).toBe(1)
  })

  it('does not end the session when the refresh could not be carried out', async () => {
    tokenService.setTokens('expired-access-token', 'refresh-token')
    server.use(
      http.get('/api/workouts', () =>
        HttpResponse.json({ error: 'Your session token is invalid or expired.' }, { status: 401 })
      )
    )

    // Offline / server error: the session may well still be alive.
    mockRefreshTokens.mockResolvedValue('unavailable')

    await expect(api.get('/workouts')).rejects.toBeInstanceOf(ApiError)

    expect(expiredCount).toBe(0)
  })
})
