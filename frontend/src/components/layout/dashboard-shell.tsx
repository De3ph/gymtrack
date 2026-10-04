"use client";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { DashboardHeader } from "./dashboard-header";

interface DashboardShellProps {
  userRole?: string;
  userName?: string;
  onLogout: () => void;
  /** Rail state persisted in the `sidebar_state` cookie, read server-side. */
  defaultSidebarOpen?: boolean;
  children: React.ReactNode;
}

/**
 * Authenticated-app layout: a collapsible sidebar rail on `lg` and up, and the
 * same navigation behind a burger/drawer on tablet and phone.
 */
export function DashboardShell({
  userRole,
  userName,
  onLogout,
  defaultSidebarOpen = true,
  children,
}: DashboardShellProps) {
  return (
    <SidebarProvider defaultOpen={defaultSidebarOpen} className="bg-background">
      <AppSidebar
        userRole={userRole}
        userName={userName}
        onLogout={onLogout}
      />

      <SidebarInset>
        <DashboardHeader />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
