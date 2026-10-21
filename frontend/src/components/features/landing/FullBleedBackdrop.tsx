"use client";

export function FullBleedBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-y-0 left-1/2 -z-10 w-screen -translate-x-1/2 bg-stone-950"
    />
  );
}
