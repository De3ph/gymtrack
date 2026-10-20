import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export interface StatusScreenProps {
  /** Status code shown above the title ("500", "404"). */
  code: string;
  /** Short label on the brand rail. */
  kicker: string;
  title: string;
  description: string;
  /** Reference code, shown in a hairline panel when present. */
  digest?: string;
  /** Label for the reference code. */
  referenceLabel?: string;
  /** Action row (buttons and links). */
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Scoreboard-style status screen: flat, hairline, monospaced where the data
 * lives. The code is the headline, the copy says what failed and what to do.
 *
 * Presentational only — no translations, no client hooks — so it can render
 * inside server components (global 404 page) as well as client ones.
 */
export function StatusScreen({
  code,
  kicker,
  title,
  description,
  digest,
  referenceLabel,
  actions,
  className,
}: StatusScreenProps) {
  return (
    <div
      className={cn(
        "flex min-h-[60vh] w-full items-center justify-center px-6 py-16",
        className
      )}
    >
      <div className="w-full max-w-2xl">
        <div className="mb-10 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          <span className="flex size-9 items-center justify-center border border-foreground bg-foreground text-background">
            GT
          </span>
          <span>{kicker}</span>
          <Separator className="flex-1" />
        </div>

        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-destructive">
          {code}
        </p>
        <h1 className="mt-4 font-mono text-4xl leading-[1.05] tracking-[-0.04em] text-foreground sm:text-6xl">
          {title}
        </h1>
        <p className="mt-6 max-w-prose text-base leading-7 text-muted-foreground">
          {description}
        </p>

        {digest && referenceLabel ? (
          <div className="mt-8 border border-border px-6 py-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {referenceLabel}
            </p>
            <p className="mt-1 font-mono text-sm text-foreground">{digest}</p>
          </div>
        ) : null}

        {actions ? (
          <div className="mt-10 flex flex-wrap items-center gap-3">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}
