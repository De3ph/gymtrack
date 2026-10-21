"use client";

/**
 * Edge-to-edge band behind a landing section.
 *
 * It is `absolute`, so the section that renders it must establish a containing
 * block (`relative`). Without one, `inset-y-0` resolves against the page
 * wrapper, the band stretches over the whole document, and its opaque color
 * paints on top of every section that comes before or after it.
 */
export function FullBleedBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-y-0 left-1/2 -z-10 w-screen -translate-x-1/2 bg-stone-950"
    />
  );
}
