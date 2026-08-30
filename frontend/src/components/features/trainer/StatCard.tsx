"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: number | string;
  icon?: LucideIcon;
  className?: string;
}

export function StatCard({ title, value, icon: Icon, className }: StatCardProps) {
  return (
    <Card className={cn("rounded-none border border-border shadow-none", className)}>
      <CardHeader className={Icon ? "flex flex-row items-center justify-between space-y-0 pb-2" : "pb-2"}>
        <CardTitle className="text-sm font-[500]">{title}</CardTitle>
        {Icon && <Icon className="size-5 text-muted-foreground" aria-hidden="true" />}
      </CardHeader>
      <CardContent>
        <div className="font-mono text-2xl font-semibold tracking-tight">{value}</div>
      </CardContent>
    </Card>
  );
}
