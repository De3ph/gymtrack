'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker (/sw.js) in production builds only.
 *
 * - Registers after window `load` so it never competes with critical resources.
 * - `updateViaCache: 'none'` guarantees the browser always fetches a fresh
 *   sw.js when checking for updates (public/ assets are not content-hashed).
 * - When an updated worker takes control (controllerchange), the page reloads
 *   once to pick up fresh assets. First-ever install is excluded so new users
 *   are not reload-bombed.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    const hadController = navigator.serviceWorker.controller != null;
    let reloading = false;

    const onControllerChange = () => {
      if (!hadController || reloading) return;
      reloading = true;
      window.location.reload();
    };

    const register = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .catch((error: unknown) => {
          console.error('Service worker registration failed:', error);
        });
    };

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register, { once: true });
    }

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      window.removeEventListener('load', register);
    };
  }, []);

  return null;
}
