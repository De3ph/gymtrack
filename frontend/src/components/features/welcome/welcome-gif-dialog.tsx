"use client"

import { useCallback, useState, useSyncExternalStore } from "react"
import Image from "next/image"
import { useTranslations } from "next-intl"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

const WELCOME_GIF_PENDING_KEY = "gymtrack:welcome-gif-pending"

// Direct Tenor media URL — more reliable than the embed widget script,
// which fails to render inside React portals. 374x374 variant (~5 MB).
const WELCOME_GIF_URL =
  "https://media1.tenor.com/m/4sGA1qdot30AAAAd/push-it-lets-go.gif"
const WELCOME_GIF_PAGE_URL =
  "https://tenor.com/view/push-it-lets-go-lifting-workout-cat-gif-16339482582496884605"

const subscribe = (onStoreChange: () => void) => {
  window.addEventListener("storage", onStoreChange)
  return () => window.removeEventListener("storage", onStoreChange)
}

const getSnapshot = () =>
  localStorage.getItem(WELCOME_GIF_PENDING_KEY) !== null

const getServerSnapshot = () => false

/**
 * One-time welcome dialog shown to newly registered users.
 * The register page sets the pending flag in localStorage after a successful
 * registration; this dialog displays the Tenor GIF exactly once and clears
 * the flag when closed.
 */
export function WelcomeGifDialog() {
  const t = useTranslations("welcomeGif")
  const pending = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const [dismissed, setDismissed] = useState(false)
  const open = pending && !dismissed

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (!nextOpen) {
      localStorage.removeItem(WELCOME_GIF_PENDING_KEY)
      setDismissed(true)
    }
  }, [])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <div className="overflow-hidden rounded-none border border-border">
          <Image
            src={WELCOME_GIF_URL}
            alt='A cat lifting weights with the caption "Push it"'
            width={374}
            height={374}
            unoptimized
            priority
            className="h-auto w-full"
          />
        </div>
        <DialogFooter className="items-center gap-2 sm:justify-between">
          <a
            href={WELCOME_GIF_PAGE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Push It Lets Go GIF — Tenor
          </a>
          <Button onClick={() => handleOpenChange(false)}>{t("close")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
