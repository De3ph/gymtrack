"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  type SortingState,
  type ColumnFiltersState,
  type PaginationState,
  type ColumnDef,
} from "@tanstack/react-table";
import { useAuthStore } from "@/stores/authStore";
import {
  adminApi,
  type AdminUserListItem,
  type AdminUserListResponse,
} from "@/lib/api/adminApi";
import {
  UsersTableContext,
  type UsersTableState,
  type UsersTableActions,
  type UsersTableMeta,
} from "./users-table-context";
import type { UserRole } from "@/types";

export interface UsersTableProviderProps {
  initialData: AdminUserListResponse;
  columns: ColumnDef<AdminUserListItem>[];
  children: React.ReactNode;
}

export function UsersTableProvider({
  initialData,
  columns,
  children,
}: UsersTableProviderProps) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  // Filters
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [period, setPeriod] = useState<"all" | "today" | "week" | "month">(
    "all",
  );

  // Table state
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "users", roleFilter, period, search],
    queryFn: () =>
      adminApi.getUsers({
        role: roleFilter === "all" ? undefined : roleFilter,
        search: search || undefined,
        limit: 500,
      }),
    enabled: isAuthenticated && user?.role === "admin",
    // Seed with server-fetched initial data (RSC streaming optimization)
    initialData: search === "" && period === "all" ? initialData : undefined,
    // Stale for 30s to avoid refetching the same data
    staleTime: 30 * 1000,
  });

  const users = data?.users ?? [];

  // Client-side search filter (only filters the page; server returns full list)
  const filteredUsers = useMemo(() => {
    const now = Date.now();
    const periods: Record<string, number> = {
      today: 86_400_000,
      week: 604_800_000,
      month: 2_592_000_000,
    };
    const cutoff = period !== "all" ? now - periods[period] : 0;
    const q = search ? search.toLowerCase() : "";

    return users.filter((u) => {
      if (search) {
        const match =
          u.username.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.profile?.name ?? "").toLowerCase().includes(q);
        if (!match) return false;
      }
      if (period !== "all") {
        if (new Date(u.createdAt).getTime() < cutoff) return false;
      }
      return true;
    });
  }, [users, search, period]);

  const table = useReactTable({
    data: filteredUsers,
    columns,
    state: { sorting, columnFilters, pagination },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    pageCount: Math.ceil(filteredUsers.length / pagination.pageSize),
  });

  const handleRowClick = useCallback(
    (userId: string) => {
      router.push(`/admin/users/${userId}`);
    },
    [router],
  );

  // Preload user detail route on hover/focus (bundle-preload)
  const preloadUserDetail = useCallback(
    (userId: string) => {
      router.prefetch(`/admin/users/${userId}`);
    },
    [router],
  );

  const state: UsersTableState = {
    search,
    roleFilter,
    period,
    sorting,
    columnFilters,
    pagination,
    data,
    isLoading,
    error,
    users,
    filteredUsers,
  };

  const actions: UsersTableActions = {
    setSearch: (v) => {
      setSearch(v);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    },
    setRoleFilter: (v) => {
      setRoleFilter(v);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    },
    setPeriod: (v) => {
      setPeriod(v);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    },
    setSorting,
    setColumnFilters,
    setPagination,
    handleRowClick,
    preloadUserDetail,
  };

  const meta: UsersTableMeta = {
    table,
  };

  return (
    <UsersTableContext.Provider value={{ state, actions, meta }}>
      {children}
    </UsersTableContext.Provider>
  );
}
