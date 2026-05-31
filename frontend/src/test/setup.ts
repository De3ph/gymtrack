import '@testing-library/jest-dom'
import { vi, beforeAll, afterEach, afterAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import { createElement } from 'react'
import { server } from './mocks/server'

vi.mock('next-intl', () => ({
  useTranslations: () => {
    return (key: string, params?: Record<string, unknown>) => {
      const lastSegment = key.split('.').pop() || key;
      if (params) {
        return lastSegment.replace(/\{(\w+)\}/g, (_: string, name: string) => String(params[name] ?? `{${name}}`));
      }
      return lastSegment;
    };
  },
}))

const createRouter = () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() })
const mockNavigation = {
  Link: ({ children, href }: { children: unknown; href: string }) =>
    createElement('a', { href }, children as never),
  redirect: (url: string) => { throw new Error('REDIRECT:' + url) },
  useRouter: createRouter,
  usePathname: () => '/',
  getPathname: () => '/',
}
vi.mock('next-intl/navigation', () => ({
  ...mockNavigation,
  createNavigation: () => mockNavigation,
}))

// Setup MSW server
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

// Reset handlers after each test
afterEach(() => {
  server.resetHandlers()
  cleanup()
})

// Close server after all tests
afterAll(() => server.close())
