"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import * as m from "motion/react-m";
import { ReactNode } from "react";
import { fadeInUp, staggerContainer } from "@/lib/animations";

interface DashboardShellProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function DashboardShell({ title, description, children }: DashboardShellProps) {
  return (
    <m.div
      className="space-y-8"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <m.section
        variants={fadeInUp}
        className="border border-border bg-card px-6 py-6 sm:px-8 sm:py-8"
      >
        <div className="max-w-3xl space-y-4">
          <h1 className="font-mono text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-foreground sm:text-5xl">
            {title}
          </h1>
          <p className="max-w-2xl font-sans text-sm leading-6 text-muted-foreground md:text-base md:leading-7">
            {description}
          </p>
        </div>
      </m.section>

      {children}
    </m.div>
  );
}

interface DashboardMetricProps {
  label: string;
  value: string | number;
  hint?: string;
  className?: string;
}

export function DashboardMetric({ label, value, hint, className }: DashboardMetricProps) {
  return (
    <m.div
      variants={fadeInUp}
      className={cn(
        "border border-border bg-card px-6 py-6 sm:px-8 sm:py-8",
        className,
      )}
    >
      <p className="font-mono text-[10px] uppercase leading-3 tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-3 font-mono text-4xl font-semibold leading-tight tracking-tight text-foreground">
        {value}
      </p>
      {hint && <p className="mt-2 font-sans text-sm leading-6 text-muted-foreground">{hint}</p>}
    </m.div>
  );
}

export function DashboardMetricSkeleton() {
  return (
    <div className="border border-border bg-card px-6 py-6 sm:px-8 sm:py-8">
      <Skeleton className="h-3 w-20 rounded-none" />
      <Skeleton className="mt-3 h-10 w-16 rounded-none" />
      <Skeleton className="mt-2 h-4 w-36 rounded-none" />
    </div>
  );
}
