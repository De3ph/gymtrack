import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

type DashboardActionButtonProps = {
  icon: ReactNode;
  label: string;
  description: string;
  onClick: () => void;
};

export function DashboardActionButton({
  icon,
  label,
  description,
  onClick,
}: DashboardActionButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      className="h-auto justify-start gap-3 rounded-2xl p-4 text-left"
      onClick={onClick}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        {icon}
      </div>
      <span className="min-w-0">
        <span className="block truncate font-semibold text-foreground">{label}</span>
        <span className="block truncate text-sm text-muted-foreground">{description}</span>
      </span>
    </Button>
  );
}
