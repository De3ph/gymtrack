"use client";

import DashboardLayout from "@/app/[locale]/(dashboard)/layout";
import RoleDashboardPage from "@/app/[locale]/(dashboard)/page";

export default function DashboardRoutePage() {
  return (
    <DashboardLayout>
      <RoleDashboardPage />
    </DashboardLayout>
  );
}
