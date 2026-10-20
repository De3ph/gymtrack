import { StatusPage } from "@/components/features/StatusPage";
import { ROUTES } from "@/lib/routes";

export default function LocaleNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <StatusPage
        variant="not-found"
        backHref={ROUTES.HOME}
        className="min-h-screen"
      />
    </main>
  );
}
