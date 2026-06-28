"use client";

import { createContext, use } from "react";
import type { SortingState, ColumnFiltersState, PaginationState, Table } from "@tanstack/react-table";
import type { AdminUserListItem, AdminUserListResponse } from "@/lib/api/adminApi";
import type { UserRole } from "@/types";

export interface UsersTableState {
  search: string;
  roleFilter: UserRole | "all";
  period: "all" | "today" | "week" | "month";
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  pagination: PaginationState;
  data: AdminUserListResponse | undefined;
  isLoading: boolean;
  error: Error | null;
  users: AdminUserListItem[];
  filteredUsers: AdminUserListItem[];
}

export interface UsersTableActions {
  setSearch: (search: string) => void;
  setRoleFilter: (role: UserRole | "all") => void;
  setPeriod: (period: "all" | "today" | "week" | "month") => void;
  setSorting: (sorting: SortingState) => void;
  setColumnFilters: (filters: ColumnFiltersState) => void;
  setPagination: (pagination: PaginationState) => void;
  handleRowClick: (userId: string) => void;
  preloadUserDetail: (userId: string) => void;
}

export interface UsersTableMeta {
  table: Table<AdminUserListItem>;
}

export interface UsersTableContextValue {
  state: UsersTableState;
  actions: UsersTableActions;
  meta: UsersTableMeta;
}

export const UsersTableContext = createContext<UsersTableContextValue | null>(null);

export function useUsersTableContext(): UsersTableContextValue {
  const ctx = use(UsersTableContext);  // React 19 use() - works conditionally
  if (!ctx) throw new Error("useUsersTableContext must be used within UsersTableProvider");
  return ctx;
}