"use client";

import { useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";

/**
 * Encapsulates the full logout flow: clears auth state (tokens + HttpOnly
 * session cookie), then hard-navigates to the locale-aware login page.
 *
 * The cookie DELETE is awaited before navigation, so protected routes
 * cannot re-admit a logged-out user via a stale cookie.
 */
export function useLogout() {
  const storeLogout = useAuthStore((s) => s.logout);

  const logout = useCallback(async () => {
    await storeLogout();

    const loginUrl =
      typeof window !== "undefined" &&
      /^\/[a-z]{2}\//.test(window.location.pathname)
        ? `/${window.location.pathname.split("/")[1]}/login`
        : "/login";

    window.location.href = loginUrl;
  }, [storeLogout]);

  return { logout };
}
