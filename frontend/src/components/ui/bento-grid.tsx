import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Bento grid primitives.
 *
 * Composition over configuration: the grid owns only columns and density.
 * Every tile is assembled from `BentoItem` plus the subcomponents below, so a
 * tile can be a short stat, a tall media card, or a wide feature without
 * adding mode props to the grid.
 *
 * Usage rules that keep the grid from reading as a pile of cards:
 * - Pass exactly as many items as the layout has cells. Spans must tile
 *   without holes.
 * - Use one `tone="accent"` item per grid, at most. It is the signal.
 * - Give two or three items a visual surface (`BentoItemMedia` or
 *   `BentoItemPattern`). Text-only cells read flat.
 * - `BentoItemLink` is the only interactive tile. Do not nest links or
 *   buttons inside it.
 *
 * Shape scale: tiles are `rounded-xl`, inner surfaces and icon wells are
 * `rounded-lg`. Do not mix another radius into the same grid.
 *
 * This file is intentionally server-safe. Motion is CSS-only, limited to
 * transform and opacity, and gated behind `motion-safe`.
 *
 * @example
 * <BentoGrid columns={4}>
 *   <BentoItem span="2x2" tone="inverse">
 *     <BentoItemPattern variant="grid" />
 *     <BentoItemHeader>
 *       <BentoItemIcon><Dumbbell /></BentoItemIcon>
 *       <BentoItemMeta>Training</BentoItemMeta>
 *     </BentoItemHeader>
 *     <BentoItemTitle>Every session in one place</BentoItemTitle>
 *     <BentoItemDescription>Sets, reps, and load, kept in order.</BentoItemDescription>
 *     <BentoItemMetric value="24h" label="Edit window" />
 *   </BentoItem>
 *   <BentoItemLink span="2x1" href="/nutrition" tone="surface">
 *     <BentoItemTitle>Nutrition</BentoItemTitle>
 *     <BentoItemDescription>Meals without the spreadsheet.</BentoItemDescription>
 *   </BentoItemLink>
 *   <BentoItem tone="muted">
 *     <BentoItemTitle>Measurements</BentoItemTitle>
 *   </BentoItem>
 *   <BentoItem tone="accent">
 *     <BentoItemTitle>Coaching</BentoItemTitle>
 *   </BentoItem>
 * </BentoGrid>
 */

type BentoColumns = 2 | 3 | 4 | 6
type BentoDensity = "compact" | "comfortable" | "spacious"
type BentoPatternVariant = "grid" | "dots" | "diagonal"
type BentoSpan = "1x1" | "2x1" | "1x2" | "2x2" | "3x2" | "full"
type BentoTone = "surface" | "muted" | "inverse" | "accent" | "outline"

const columnsStyles: Record<BentoColumns, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
  6: "sm:grid-cols-2 lg:grid-cols-6",
}

const densityStyles: Record<BentoDensity, string> = {
  compact:
    "[--bento-gap:0.75rem] [--bento-pad:1rem] sm:[--bento-gap:0.75rem]",
  comfortable:
    "[--bento-gap:1rem] [--bento-pad:1.25rem] sm:[--bento-gap:1.25rem] sm:[--bento-pad:1.5rem]",
  spacious:
    "[--bento-gap:1.25rem] [--bento-pad:1.5rem] sm:[--bento-gap:1.5rem] sm:[--bento-pad:2rem]",
}

const spanStyles: Record<BentoSpan, string> = {
  "1x1": "",
  "2x1": "md:col-span-2",
  "1x2": "lg:row-span-2",
  "2x2": "md:col-span-2 lg:row-span-2",
  "3x2": "md:col-span-2 lg:col-span-3 lg:row-span-2",
  full: "md:col-span-2 lg:col-span-full",
}

const toneStyles: Record<BentoTone, string> = {
  surface: "bg-card text-card-foreground ring-foreground/10",
  muted: "bg-muted/50 text-foreground ring-border",
  inverse: "bg-foreground text-background ring-foreground/20",
  accent: "bg-accent text-accent-foreground ring-accent/50",
  outline: "bg-transparent text-foreground ring-border",
}

const mutedTextStyles =
  "text-muted-foreground group-data-[tone=inverse]/item:text-background/70 group-data-[tone=accent]/item:text-accent-foreground/75"

const interactiveStyles =
  "cursor-pointer motion-safe:transition-[transform,box-shadow] motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.23,1,0.32,1)] hover:ring-foreground/25 motion-safe:hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-0 active:duration-100"

function itemClassName({
  span = "1x1",
  tone = "surface",
  interactive = false,
  className,
}: {
  span?: BentoSpan
  tone?: BentoTone
  interactive?: boolean
  className?: string
}) {
  return cn(
    "group/item relative isolate flex min-w-0 flex-col overflow-hidden rounded-xl p-[var(--bento-pad,1.25rem)] ring-1",
    toneStyles[tone],
    spanStyles[span],
    interactive && interactiveStyles,
    className,
  )
}

interface BentoItemBaseProps {
  /** Cell footprint. Spans collapse to one column below `md`. */
  span?: BentoSpan
  /** Surface treatment. Keep `accent` to one tile per grid. */
  tone?: BentoTone
}

interface BentoGridProps extends React.ComponentProps<"div"> {
  /** Desktop column count. Mobile is always one column. */
  columns?: BentoColumns
  /** Controls tile padding and the gap between tiles. */
  density?: BentoDensity
}

function BentoGrid({
  columns = 3,
  density = "comfortable",
  className,
  ...props
}: BentoGridProps) {
  return (
    <div
      data-slot="bento-grid"
      data-columns={columns}
      data-density={density}
      className={cn(
        "grid auto-rows-[minmax(10rem,auto)] grid-cols-1 gap-[var(--bento-gap)]",
        densityStyles[density],
        columnsStyles[columns],
        className,
      )}
      {...props}
    />
  )
}

interface BentoItemProps extends React.ComponentProps<"div">, BentoItemBaseProps {}

function BentoItem({ span = "1x1", tone = "surface", className, ...props }: BentoItemProps) {
  return (
    <div
      data-slot="bento-item"
      data-span={span}
      data-tone={tone}
      className={itemClassName({ span, tone, className })}
      {...props}
    />
  )
}

interface BentoItemLinkProps extends React.ComponentProps<"a">, BentoItemBaseProps {}

/**
 * The interactive tile variant. The whole surface is the link, so the tile
 * must not contain another link or button.
 */
function BentoItemLink({
  span = "1x1",
  tone = "surface",
  className,
  ...props
}: BentoItemLinkProps) {
  return (
    <a
      data-slot="bento-item"
      data-span={span}
      data-tone={tone}
      className={itemClassName({ span, tone, interactive: true, className })}
      {...props}
    />
  )
}

function BentoItemHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="bento-item-header"
      className={cn("flex items-start justify-between gap-3", className)}
      {...props}
    />
  )
}

function BentoItemIcon({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="bento-item-icon"
      aria-hidden="true"
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-current/15 bg-current/5 [&_svg]:size-5",
        className,
      )}
      {...props}
    />
  )
}

function BentoItemMeta({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="bento-item-meta"
      className={cn(
        "font-mono text-[10px] uppercase tracking-[0.18em]",
        mutedTextStyles,
        className,
      )}
      {...props}
    />
  )
}

interface BentoItemTitleProps extends React.ComponentProps<"h3"> {
  as?: "h2" | "h3" | "h4"
}

function BentoItemTitle({
  as: Comp = "h3",
  className,
  ...props
}: BentoItemTitleProps) {
  return (
    <Comp
      data-slot="bento-item-title"
      className={cn(
        "mt-3 font-heading text-lg font-semibold tracking-tight text-balance first:mt-0 sm:text-xl",
        className,
      )}
      {...props}
    />
  )
}

function BentoItemDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="bento-item-description"
      className={cn(
        "mt-2 max-w-[52ch] text-sm leading-relaxed text-pretty first:mt-0",
        mutedTextStyles,
        className,
      )}
      {...props}
    />
  )
}

interface BentoItemMetricProps extends React.ComponentProps<"div"> {
  value: React.ReactNode
  label: React.ReactNode
  hint?: React.ReactNode
}

function BentoItemMetric({
  value,
  label,
  hint,
  className,
  ...props
}: BentoItemMetricProps) {
  return (
    <div
      data-slot="bento-item-metric"
      className={cn("mt-4 flex flex-col gap-1 first:mt-0", className)}
      {...props}
    >
      <span className="font-heading text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">
        {value}
      </span>
      <span className={cn("text-xs", mutedTextStyles)}>{label}</span>
      {hint ? (
        <span className={cn("text-xs opacity-80", mutedTextStyles)}>{hint}</span>
      ) : null}
    </div>
  )
}

function BentoItemMedia({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="bento-item-media"
      className={cn(
        "relative mt-5 min-h-32 flex-1 overflow-hidden rounded-lg border border-current/10 bg-current/5 first:mt-0",
        "motion-safe:[&>img]:transition-transform motion-safe:[&>img]:duration-500 motion-safe:group-hover/item:[&>img]:scale-[1.02]",
        className,
      )}
      {...props}
    />
  )
}

const patternStyles: Record<BentoPatternVariant, React.CSSProperties> = {
  grid: {
    backgroundImage:
      "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
    backgroundSize: "28px 28px",
  },
  dots: {
    backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)",
    backgroundSize: "18px 18px",
  },
  diagonal: {
    backgroundImage:
      "repeating-linear-gradient(-45deg, currentColor 0 1px, transparent 1px 14px)",
  },
}

interface BentoItemPatternProps extends React.ComponentProps<"div"> {
  variant?: BentoPatternVariant
}

/**
 * Decorative surface for tiles that have no image. Sits behind tile content
 * so a pattern can fill the cell without moving the text.
 */
function BentoItemPattern({
  variant = "grid",
  className,
  style,
  ...props
}: BentoItemPatternProps) {
  return (
    <div
      data-slot="bento-item-pattern"
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 -z-10 opacity-[0.09]",
        className,
      )}
      style={{ ...patternStyles[variant], ...style }}
      {...props}
    />
  )
}

function BentoItemFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="bento-item-footer"
      className={cn("mt-auto flex items-center justify-between gap-3 pt-5", className)}
      {...props}
    />
  )
}

export {
  BentoGrid,
  BentoItem,
  BentoItemLink,
  BentoItemHeader,
  BentoItemIcon,
  BentoItemMeta,
  BentoItemTitle,
  BentoItemDescription,
  BentoItemMetric,
  BentoItemMedia,
  BentoItemPattern,
  BentoItemFooter,
}

export type {
  BentoColumns,
  BentoDensity,
  BentoGridProps,
  BentoItemLinkProps,
  BentoItemMetricProps,
  BentoItemPatternProps,
  BentoItemProps,
  BentoItemTitleProps,
  BentoPatternVariant,
  BentoSpan,
  BentoTone,
}
