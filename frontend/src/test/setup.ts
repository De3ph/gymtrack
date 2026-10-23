import '@testing-library/jest-dom'
import { vi, beforeAll, afterEach, afterAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import { createElement, Fragment, type ReactNode } from 'react'
import { server } from './mocks/server'

// `next-intl` is mocked so components render without a Next.js request scope.
// The mock resolves keys against the real messages/en.json — see ./i18n.ts.
// The factory is async so it can import after `vi.mock` hoisting.
vi.mock('next-intl', async () => {
  const { createTestTranslator, TEST_LOCALE, testMessages } = await import('./i18n')

  return {
    useTranslations: (namespace?: string | string[]) => createTestTranslator(namespace),
    useLocale: () => TEST_LOCALE,
    useMessages: () => testMessages,
    useNow: () => new Date('2024-01-01T00:00:00Z'),
    useTimeZone: () => 'UTC',
    hasLocale: (locale: unknown) => typeof locale === 'string',
    // Server-side equivalents, kept for completeness.
    getTranslations: async (namespace?: string | string[]) => createTestTranslator(namespace),
    getLocale: async () => TEST_LOCALE,
    getMessages: async () => testMessages,
    // Renders children unchanged; no locale context is needed with the mock above.
    NextIntlClientProvider: ({ children }: { children?: ReactNode }) =>
      createElement(Fragment, null, children),
  }
})

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

// jsdom implements neither scrollIntoView nor the pointer-capture APIs that
// Base UI primitives call. Without these, a component that scrolls on mount
// throws "card.scrollIntoView is not a function" mid-test.
if (typeof Element !== 'undefined') {
  Element.prototype.scrollIntoView ??= function scrollIntoView() {}
  Element.prototype.hasPointerCapture ??= function hasPointerCapture() {
    return false
  }
  Element.prototype.setPointerCapture ??= function setPointerCapture() {}
  Element.prototype.releasePointerCapture ??= function releasePointerCapture() {}
}

// jsdom has no IntersectionObserver, which Motion needs for `whileInView` /
// `inView`. Without it, rendering a viewport-triggered component throws
// "IntersectionObserver is not defined" while the observer is set up.
// Every observed element is reported as fully in view, so viewport-triggered
// content resolves to its "visible" variant.
if (typeof window !== 'undefined' && !window.IntersectionObserver) {
  class MockIntersectionObserver implements IntersectionObserver {
    readonly root: Element | Document | null = null
    readonly rootMargin: string = ''
    readonly thresholds: ReadonlyArray<number> = [0]

    constructor(private callback: IntersectionObserverCallback) {}

    observe(target: Element): void {
      this.callback(
        [
          {
            isIntersecting: true,
            intersectionRatio: 1,
            target,
            boundingClientRect: target.getBoundingClientRect(),
            intersectionRect: target.getBoundingClientRect(),
            rootBounds: null,
            time: 0,
          } as IntersectionObserverEntry,
        ],
        this as unknown as IntersectionObserver,
      )
    }

    unobserve(): void {}
    disconnect(): void {}
    takeRecords(): IntersectionObserverEntry[] {
      return []
    }
  }

  window.IntersectionObserver =
    MockIntersectionObserver as unknown as typeof IntersectionObserver
}

// Setup MSW server
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

// Reset handlers after each test
afterEach(() => {
  server.resetHandlers()
  cleanup()
})

// Close server after all tests
afterAll(() => server.close())
