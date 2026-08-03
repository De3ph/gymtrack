import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <div className="min-h-[70vh] w-full space-y-8 px-4 py-6 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-sm md:p-10">
        <div className="space-y-4">
          <Skeleton className="h-7 w-32 rounded-full" />
          <Skeleton className="h-10 w-full max-w-2xl" />
          <Skeleton className="h-5 w-full max-w-3xl" />
          <Skeleton className="h-5 w-2/3 max-w-2xl" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-2xl border border-border bg-card p-5 shadow-xs ring-1 ring-foreground/5"
          >
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="mt-3 h-10 w-16" />
            <Skeleton className="mt-2 h-4 w-36" />
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Skeleton className="h-80 w-full rounded-2xl" />
          <Skeleton className="h-80 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
