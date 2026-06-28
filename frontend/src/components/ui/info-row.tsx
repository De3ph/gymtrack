import * as React from "react"

interface InfoRowProps {
  icon: React.ElementType;
  label: string;
  value: string | number | undefined | null | React.ReactNode;
}

export function InfoRow({ icon: Icon, label, value }: InfoRowProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 rounded-md bg-muted p-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">
          {value ?? <span className="italic text-muted-foreground/60">Not set</span>}
        </p>
      </div>
    </div>
  );
}