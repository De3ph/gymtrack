import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ServiceWorkerRegistrar } from '@/components/pwa/service-worker-registrar';

function stubServiceWorker() {
  const container = {
    register: vi.fn().mockResolvedValue({}),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    controller: null as ServiceWorker | null,
  };
  Object.defineProperty(window.navigator, 'serviceWorker', {
    value: container,
    configurable: true,
  });
  return container;
}

function stubReadyState(value: DocumentReadyState) {
  Object.defineProperty(document, 'readyState', {
    value,
    configurable: true,
  });
}

describe('ServiceWorkerRegistrar', () => {
  beforeEach(() => {
    stubReadyState('complete');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('renders nothing', () => {
    stubServiceWorker();
    const { container } = render(<ServiceWorkerRegistrar />);
    expect(container).toBeEmptyDOMElement();
  });

  it('does not register outside production', () => {
    const sw = stubServiceWorker();
    render(<ServiceWorkerRegistrar />);
    expect(sw.register).not.toHaveBeenCalled();
  });

  it('registers /sw.js in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const sw = stubServiceWorker();
    render(<ServiceWorkerRegistrar />);
    expect(sw.register).toHaveBeenCalledWith('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    });
  });

  it('defers registration until window load when the document is still loading', () => {
    vi.stubEnv('NODE_ENV', 'production');
    stubReadyState('loading');
    const sw = stubServiceWorker();

    render(<ServiceWorkerRegistrar />);
    expect(sw.register).not.toHaveBeenCalled();

    window.dispatchEvent(new Event('load'));
    expect(sw.register).toHaveBeenCalledTimes(1);
  });

  it('skips registration when service workers are unsupported', () => {
    vi.stubEnv('NODE_ENV', 'production');
    delete (window.navigator as { serviceWorker?: unknown }).serviceWorker;
    expect(() => render(<ServiceWorkerRegistrar />)).not.toThrow();
  });
});
