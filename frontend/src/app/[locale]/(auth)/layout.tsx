import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LocaleToggle } from "@/components/layout/locale-toggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen">
      <div className="fixed right-4 top-4 z-50 flex items-center gap-1">
        <ThemeToggle />
        <LocaleToggle />
      </div>
      <div className="relative flex w-full flex-col items-center justify-center overflow-auto bg-background px-6 py-12 lg:px-16">
        <div className="absolute left-0 top-0 h-1 w-full bg-primary lg:left-0 lg:top-0 lg:h-full lg:w-1" />
        <div className="w-full max-w-md">{children}</div>
        <p className="mt-12 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/40">
          GymTrack
        </p>
      </div>
    </div>
  );
}
