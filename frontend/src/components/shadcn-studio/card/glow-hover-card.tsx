"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type GlowHoverCardProps = {
  title?: string;
  /** Leading icon tile rendered next to the title. */
  icon?: ReactNode;
  /** Makes the card activatable (click + keyboard). */
  onClick?: () => void;
  className?: string;
  /** Extra classes for the inner `Card` (e.g. to stretch it to full width). */
  cardClassName?: string;
};

/**
 * Glow-on-hover card.
 *
 * A spotlight blob follows the cursor across the card surface. The blob is
 * positioned by reading the bounding box of an invisible `.fake-blob` anchor
 * (which sits at the card's top-left) and translating the visible `.blob` by
 * the cursor offset relative to that anchor.
 *
 * The mouse listener is attached to the card element itself (via a ref) rather
 * than to `window`, so several instances can coexist on one page without
 * every instance animating every other instance's blob.
 */
export function GlowHoverCard({
  title = "Hover for the Glow-Up",
  icon,
  onClick,
  className,
  cardClassName,
}: GlowHoverCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const interactive = Boolean(onClick);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const blob = card.querySelector<HTMLElement>(".blob");
    const fakeBlob = card.querySelector<HTMLElement>(".fake-blob");
    if (!blob || !fakeBlob) return;

    const handleMouseMove = (event: MouseEvent) => {
      const rec = fakeBlob.getBoundingClientRect();

      blob.style.opacity = "1";

      blob.animate(
        [
          {
            transform: `translate(${
              event.clientX - rec.left - rec.width / 2
            }px, ${event.clientY - rec.top - rec.height / 2}px)`,
          },
        ],
        {
          duration: 300,
          fill: "forwards",
        },
      );
    };

    const handleMouseLeave = () => {
      blob.style.opacity = "0";
    };

    card.addEventListener("mousemove", handleMouseMove);
    card.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      card.removeEventListener("mousemove", handleMouseMove);
      card.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <div className={cn("h-max w-full", className)}>
      <div
        ref={cardRef}
        onClick={interactive ? onClick : undefined}
        onKeyDown={
          interactive
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onClick?.();
                }
              }
            : undefined
        }
        role={interactive ? "button" : undefined}
        tabIndex={interactive ? 0 : undefined}
        className={cn(
          "spotlight-card group bg-border relative overflow-hidden rounded-xl p-px transition-all duration-300 ease-in-out",
          interactive &&
            "cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        )}
      >
        <Card
          className={cn(
            "group-hover:bg-card/90 max-w-80 ring-0 transition-all duration-300 ease-in-out group-hover:backdrop-blur-[20px]",
            cardClassName,
          )}
        >
          <CardContent>
            <CardTitle className="flex items-center gap-3 text-lg font-semibold">
              {icon ? (
                <span
                  className="flex size-10 shrink-0 items-center justify-center border border-border bg-background text-muted-foreground"
                  aria-hidden="true"
                >
                  {icon}
                </span>
              ) : null}
              <span className="min-w-0 truncate">{title}</span>
            </CardTitle>
          </CardContent>
        </Card>
        <div className="blob pointer-events-none absolute top-0 left-0 size-20 rounded-full bg-sky-600/60 opacity-0 blur-2xl transition-all duration-300 ease-in-out dark:bg-sky-400/60" />
        <div className="fake-blob pointer-events-none absolute top-0 left-0 size-20 rounded-full" />
      </div>
    </div>
  );
}

export default GlowHoverCard;
