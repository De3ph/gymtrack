import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface FeatureExample {
  label: string;
  badge: string;
  title: string;
  subtitle: string;
  extras: string[];
}

interface LandingFeatureExampleProps {
  icon: LucideIcon;
  example: FeatureExample;
}

/**
 * Sample record card shown next to a feature. Purely presentational:
 * every string is already resolved by the caller.
 */
export function LandingFeatureExample({
  icon: Icon,
  example,
}: LandingFeatureExampleProps) {
  return (
    <div className="mt-6 rounded-lg border border-border bg-muted/30 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
          <span className="text-sm font-medium text-muted-foreground">
            {example.label}
          </span>
        </div>
        <Badge
          variant="outline"
          className="rounded-none border-border bg-background px-2 py-0 text-sm font-medium"
        >
          {example.badge}
        </Badge>
      </div>

      <div className="mt-4 space-y-1">
        <p className="text-2xl font-medium text-foreground">{example.title}</p>
        <p className="text-sm font-medium tabular-nums text-muted-foreground">
          {example.subtitle}
        </p>
      </div>

      <div className="mt-4 space-y-1.5">
        {example.extras.map((extra, i) => (
          <div key={`${extra}-${i}`} className="flex items-center gap-2">
            <span className="size-1 rounded-full bg-muted-foreground/40" />
            <span className="text-sm font-medium text-muted-foreground">{extra}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
