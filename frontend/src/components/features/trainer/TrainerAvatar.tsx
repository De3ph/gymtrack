"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface TrainerAvatarProps {
  name: string;
  photoUrl?: string;
  rating?: number;
  isAvailable?: boolean;
  size?: number;
}

export function TrainerAvatar({
  name,
  photoUrl,
  rating = 0,
  isAvailable = false,
  size = 96,
}: TrainerAvatarProps) {
  const [hasError, setHasError] = useState(false);

  const initials = name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const r = 46;
  const circ = 2 * Math.PI * r;
  const normalizedRating = Math.min(Math.max(rating, 0), 5);
  const strokeDashoffset = circ * (1 - normalizedRating / 5);
  const avatarSize = size - 12;

  return (
    <div
      className='relative inline-flex items-center justify-center'
      style={{ width: size, height: size }}
      aria-label={`Rated ${normalizedRating.toFixed(1)} out of 5`}
    >
      <svg
        className='absolute inset-0 -rotate-90'
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        fill='none'
        role='img'
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke='#e7e5e4'
          strokeWidth={4}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke='#d93535'
          strokeWidth={4}
          strokeDasharray={circ}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap='round'
        />
      </svg>

      {isAvailable && (
        <span className='absolute bottom-1 right-1 z-10 h-3 w-3 rounded-full bg-[#14b8a6] ring-2 ring-[#fafaf9]' />
      )}

      <div
        className={cn(
          "relative overflow-hidden rounded-full bg-stone-200",
          !photoUrl || hasError ? "flex items-center justify-center" : ""
        )}
        style={{ width: avatarSize, height: avatarSize }}
      >
        {photoUrl && !hasError ? (
          <Image
            src={photoUrl}
            alt={name}
            fill
            className='object-cover'
            onError={() => setHasError(true)}
            sizes={`${avatarSize}px`}
          />
        ) : (
          <span className='text-sm font-semibold text-stone-600'>
            {initials}
          </span>
        )}
      </div>
    </div>
  )
}
