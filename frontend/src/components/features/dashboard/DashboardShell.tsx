"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { motion, LazyMotion, domAnimation } from "framer-motion";
import { ReactNode } from "react";
import { fadeInUp, staggerContainer } from "@/lib/animations";

interface DashboardShellProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}

export function DashboardShell({ eyebrow, title, description, children }: DashboardShellProps) {
  return (
    <motion.div
      className="space-y-8"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.section
        variants={fadeInUp}
        className="relative overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-sm md:p-10"
      >
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-primary/10 blur-3xl md:h-72 md:w-72" />
        <div className="relative space-y-4 max-w-3xl">
          <div className="inline-flex items-center rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            {eyebrow}
          </div>
          <h1 className="font-heading text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            {title}
          </h1>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
            {description}
          </p>
        </div>
      </motion.section>

      {children}
    </motion.div>
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
    <motion.div
      variants={fadeInUp}
      className={cn(
        "rounded-2xl border border-border bg-card p-5 shadow-xs ring-1 ring-foreground/5",
        className,
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-3 font-heading text-4xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
      {hint && <p className="mt-2 text-sm text-muted-foreground">{hint}</p>}
    </motion.div>
  );
}

export function DashboardMetricSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs ring-1 ring-foreground/5">
      <Skeleton className="h-3.5 w-20" />
      <Skeleton className="mt-3 h-10 w-16" />
      <Skeleton className="mt-2 h-4 w-36" />
    </div>
  );
}
