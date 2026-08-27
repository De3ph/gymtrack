import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Local admin register wrapper around the Card primitive.
 * DESIGN.md §5.2: DetailSection has no override hook, so admin surfaces
 * compose Card parts with explicit overrides instead.
 */
export function DetailPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded-none border border-border shadow-none ring-0">
      <CardHeader className="rounded-none border-b border-border">
        <CardTitle className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}