"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Dumbbell } from "lucide-react";

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  aspectRatio?: string;
  className?: string;
  fallback?: ReactNode;
  priority?: boolean;
}

export function ImageWithFallback({
  src,
  alt,
  aspectRatio = "4/3",
  className,
  fallback,
  priority = false,
}: ImageWithFallbackProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div
      className={cn("relative overflow-hidden rounded-xl bg-muted", className)}
      style={{ aspectRatio }}
    >
      {!hasError ? (
        <Image
          src={src}
          alt={alt}
          fill
          className={cn(
            "object-cover transition-opacity duration-300",
            isLoaded ? "opacity-100" : "opacity-0",
          )}
          unoptimized
          onError={() => setHasError(true)}
          onLoad={() => setIsLoaded(true)}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          priority={priority}
        />
      ) : null}
      {(!src || hasError) && (
        <div className="flex h-full w-full items-center justify-center bg-muted">
          {fallback ?? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Dumbbell className="size-8 opacity-40" />
              <span className="text-xs font-medium opacity-40">{alt}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
