import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LocaleToggle } from "@/components/layout/locale-toggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-muted to-secondary px-4">
      <div className="fixed right-4 top-4 z-50 flex items-center gap-1">
        <ThemeToggle />
        <LocaleToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-foreground">
            GymTrack
          </h1>
        </div>
        {children}
      </div>
    </div>
  );
}
