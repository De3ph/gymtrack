"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ClockAlertIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { subscribeSessionExpired } from "@/lib/session-expiry";
import { useLogout } from "@/lib/hooks/useLogout";
import { useAuthStore } from "@/stores/authStore";

/**
 * Tells the user their session is gone and lets them log out.
 *
 * The API client raises the session-expiry signal when a request fails with
 * a 401 and the refresh token is rejected too. There is nothing left to do
 * at that point, so the only way out is to log out — which is why closing
 * the modal (X button, Escape) logs out as well.
 */
export function SessionExpiredDialog() {
  const t = useTranslations("auth.session_expired");
  const { logout } = useLogout();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [open, setOpen] = useState(false);
  // Guards against logging out twice: closing the modal and pressing the
  // button can both fire in the same tick.
  const loggedOutRef = useRef(false);

  // A signed-in user may hit a fresh expiry later in the same page session
  // (e.g. they log in again without a full reload), so the guard has to be
  // released once there is a session again.
  useEffect(() => {
    if (isAuthenticated) {
      loggedOutRef.current = false;
    }
  }, [isAuthenticated]);

  useEffect(
    () =>
      subscribeSessionExpired(() => {
        // A late 401 from a request that was already in flight when the user
        // logged out must not re-open the modal.
        if (loggedOutRef.current) return;
        // Without a session there is nothing to log out of.
        if (!isAuthenticated) return;
        setOpen(true);
      }),
    [isAuthenticated]
  );

  const handleLogout = useCallback(() => {
    if (loggedOutRef.current) return;
    loggedOutRef.current = true;
    // The modal deliberately stays open until the redirect happens: it is the
    // explanation for why the user is being logged out, and closing it early
    // would flash the dashboard's "session required" overlay instead.
    void (async () => {
      try {
        await logout();
      } catch (error) {
        console.error("Logout failed:", error);
      }
    })();
  }, [logout]);

  return (
    <Dialog
      open={open}
      // Pointer dismissal is disabled on purpose: closing the modal logs the
      // user out, and a stray click outside must not destroy the session (and
      // any unsaved input) while they are working.
      disablePointerDismissal
      onOpenChange={(nextOpen) => {
        // Closing the modal is treated exactly like pressing Logout: the
        // session is dead either way, so the user must not stay signed in.
        if (!nextOpen) handleLogout();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClockAlertIcon className="size-5 text-destructive" aria-hidden="true" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={handleLogout} className="w-full sm:w-auto">
            {t("logout")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
