"use client";

import dynamic from "next/dynamic";
import { UsersTableSkeleton } from "./UsersTableSkeleton";
import type { AdminUserListResponse } from "@/lib/api/adminApi";

/**
 * Client Component wrapper that lazy-loads UsersTableClient with SSR disabled.
 * Extracted from the Server Component page to satisfy Next.js constraint:
 * `ssr: false` is not allowed in Server Components.
 */
const UsersTableClient = dynamic(
  () => import("./UsersTableClient").then((m) => ({ default: m.UsersTableClient })),
  {
    loading: () => <UsersTableSkeleton />,
    ssr: false,
  },
);

export function UsersTableClientWrapper({ initialData }: { initialData: AdminUserListResponse }) {
  return <UsersTableClient initialData={initialData} />;
}
