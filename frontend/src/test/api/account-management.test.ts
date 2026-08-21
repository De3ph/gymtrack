import { describe, it, expect } from 'vitest'
import { userApi } from '@/lib/api/userApi'
import { authApi } from '@/lib/api/authApi'

describe('userApi.deleteAccount', () => {
  it('sends DELETE /users/me with password body', async () => {
    const result = await userApi.deleteAccount('correct123')
    expect(result).toEqual({ message: 'Account deleted successfully' })
  })

  it('throws on wrong password', async () => {
    await expect(userApi.deleteAccount('wrongpass')).rejects.toThrow('invalid password')
  })
})

describe('authApi.restoreAccount', () => {
  it('sends POST /auth/restore with identifier and password', async () => {
    const result = await authApi.restoreAccount({
      identifier: 'deleted@test.com',
      password: 'correct123',
    })
    expect(result.accessToken).toBe('restored-access-token')
    expect(result.refreshToken).toBe('restored-refresh-token')
    expect(result.user.email).toBe('deleted@test.com')
  })

  it('throws on invalid credentials', async () => {
    await expect(
      authApi.restoreAccount({ identifier: 'deleted@test.com', password: 'wrong' })
    ).rejects.toThrow('restore period expired')
  })
})
