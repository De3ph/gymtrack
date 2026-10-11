import { describe, it, expect } from 'vitest'
import { userApi } from '@/lib/api/userApi'
import { authApi } from '@/lib/api/authApi'
import { DELETE_ACCOUNT_PASSWORD, RESTORE_PASSWORD } from '@/test/mocks/handlers'

const RESTORE_IDENTIFIER = 'deleted@test.com'

describe('userApi.deleteAccount', () => {
  it('sends DELETE /users/me with password body', async () => {
    const result = await userApi.deleteAccount(DELETE_ACCOUNT_PASSWORD)
    expect(result).toEqual({ message: 'Account deleted successfully' })
  })

  it('throws on wrong password', async () => {
    await expect(userApi.deleteAccount('wrongpass')).rejects.toThrow('invalid password')
  })
})

describe('authApi.restoreAccount', () => {
  it('sends POST /auth/restore with identifier and password', async () => {
    const result = await authApi.restoreAccount({
      identifier: RESTORE_IDENTIFIER,
      password: RESTORE_PASSWORD,
    })
    expect(result.accessToken).toBe('restored-access-token')
    expect(result.refreshToken).toBe('restored-refresh-token')
    expect(result.user.email).toBe(RESTORE_IDENTIFIER)
  })

  it('throws on invalid credentials', async () => {
    await expect(
      authApi.restoreAccount({ identifier: RESTORE_IDENTIFIER, password: 'wrong' })
    ).rejects.toThrow('restore period expired')
  })
})
