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
      className="h-auto justify-start gap-3 rounded-none border-border px-4 py-4 text-left"
      onClick={onClick}
    >
      <span className="flex size-8 shrink-0 items-center justify-center border border-border bg-background text-muted-foreground" aria-hidden="true">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-sans text-sm font-medium leading-6 text-foreground">{label}</span>
        <span className="block truncate font-sans text-xs leading-4 text-muted-foreground">{description}</span>
      </span>
    </Button>
  );
}
