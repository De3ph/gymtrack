"use client";

/**
 * Global "this session is over" signal.
 *
 * The API client is a plain module with no React dependency, so it cannot
 * open a dialog itself. Instead it raises this signal and the
 * <SessionExpiredDialog /> mounted by the app providers subscribes to it and
 * asks the user to log out.
 *
 * Kept dependency-free on purpose: importing the auth store here would
 * create a cycle (store -> api layer -> this module).
 */

type SessionExpiredListener = () => void;

const listeners = new Set<SessionExpiredListener>();

// A burst of parallel 401s must produce a single announcement.
let announced = false;

/**
 * Subscribe to session-expiry notifications.
 * @returns An unsubscribe function.
 */
export function subscribeSessionExpired(
  listener: SessionExpiredListener
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Announce that the session can no longer be used. Every subscriber is
 * notified, so the modal shows up even when several requests failed at once.
 */
export function notifySessionExpired(): void {
  if (announced) return;
  announced = true;

  // Copy first: a listener may unsubscribe while we are iterating.
  for (const listener of Array.from(listeners)) {
    try {
      listener();
    } catch (error) {
      console.error("Session expiry listener failed:", error);
    }
  }
}

/**
 * Allow the notice to fire again. Called when a session is (re-)established,
 * so a fresh expiry in the same page session still opens the modal.
 */
export function clearSessionExpiryNotice(): void {
  announced = false;
}
