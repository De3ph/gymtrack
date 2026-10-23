"use client";

import { useMemo } from "react";
import {
  flexRender,
  createColumnHelper,
  type ColumnDef,
} from "@tanstack/react-table";
import { useLocale, useTranslations } from "next-intl";
import type { AdminUserListItem, AdminUserListResponse } from "@/lib/api/adminApi";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
} from "lucide-react";
import { UsersTableProvider } from "./users-table-provider";
import { UserTableFilters } from "./user-table-filters";
import { UsersTableStateHandler } from "./users-table-state-handler";
import { UsersTablePagination } from "./users-table-pagination";
import { useUsersTableContext } from "./users-table-context";

const columnHelper = createColumnHelper<AdminUserListItem>();

const badgeRegister = "h-auto rounded-none px-2.5 py-0.5";

const roleBadgeVariant: Record<
  string,
  "default" | "secondary" | "outline" | "destructive" | "ghost"
> = {
  admin: "destructive",
  trainer: "default",
  athlete: "secondary",
};

function SortableHeader({
  label,
  column,
}: {
  label: string;
  column: { getIsSorted: () => false | "asc" | "desc"; toggleSorting: () => void };
}) {
  return (
    <button
      onClick={() => column.toggleSorting()}
      className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em]"
    >
      {label}
      {column.getIsSorted() === "asc" ? (
        <ArrowUp className="size-4" />
      ) : column.getIsSorted() === "desc" ? (
        <ArrowDown className="size-4" />
      ) : (
        <ArrowUpDown className="size-4 opacity-40" />
      )}
    </button>
  );
}

export interface UsersTableClientProps {
  initialData: AdminUserListResponse;
}

export function UsersTableClient({ initialData }: UsersTableClientProps) {
  const t = useTranslations("admin.users");
  const tRoles = useTranslations("admin.roles");
  const locale = useLocale();

  const columns = useMemo(
    () => [
      columnHelper.accessor("username", {
        header: ({ column }) => (
          <SortableHeader label={t("columns.username")} column={column} />
        ),
        cell: (info) => (
          <span className="font-semibold">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("email", {
        header: t("columns.email"),
        cell: (info) => (
          <span className="text-muted-foreground">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("role", {
        header: ({ column }) => (
          <SortableHeader label={t("columns.role")} column={column} />
        ),
        cell: (info) => (
          <Badge
            variant={roleBadgeVariant[info.getValue()] ?? "outline"}
            className={badgeRegister}
          >
            {tRoles(info.getValue())}
          </Badge>
        ),
      }),
      columnHelper.accessor("profile.name", {
        id: "name",
        header: t("columns.name"),
        cell: (info) => info.getValue() || "—",
      }),
      columnHelper.accessor("createdAt", {
        header: ({ column }) => (
          <SortableHeader label={t("columns.joined")} column={column} />
        ),
        cell: (info) => {
          const date = new Date(info.getValue());
          return (
            <span className="text-muted-foreground">
              {date.toLocaleDateString(locale, {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          );
        },
      }),
      columnHelper.accessor("userId", {
        id: "actions",
        header: "",
        cell: () => (
          <span className="flex justify-end">
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Eye className="h-3 w-3" />
              {t("columns.view")}
            </span>
          </span>
        ),
        enableSorting: false,
      }),
    ],
    [locale, t, tRoles],
  );

  return (
    <UsersTableProvider
      initialData={initialData}
      columns={columns as unknown as ColumnDef<AdminUserListItem>[]}
    >
      <UsersTableContent />
    </UsersTableProvider>
  );
}

function UsersTableContent() {
  const t = useTranslations("admin.users");
  const { state, actions, meta } = useUsersTableContext();
  const { data, filteredUsers, users } = state;
  const table = meta.table;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-mono text-3xl leading-tight tracking-[-0.04em]">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {data
            ? t("count", { count: data.total ?? data.users?.length ?? 0 })
            : t("description")}
        </p>
      </div>

      {/* Filters */}
      <UserTableFilters />

      {/* Table */}
      <div className="border border-border">
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-mono text-[10px] uppercase leading-3 tracking-[0.18em] text-muted-foreground">
            {t("accounts")}
          </h2>
          <span className="font-mono text-[10px] uppercase leading-3 tracking-[0.18em] text-muted-foreground">
            {filteredUsers.length === users.length
              ? t("count", { count: users.length })
              : t("filtered_count", {
                  filtered: filteredUsers.length,
                  total: users.length,
                })}
          </span>
        </header>
        <UsersTableStateHandler>
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    onClick={() => actions.handleRowClick(row.original.userId)}
                    onMouseEnter={() => actions.preloadUserDetail(row.original.userId)}
                    onFocus={() => actions.preloadUserDetail(row.original.userId)}
                    className="cursor-pointer"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <UsersTablePagination />
          </UsersTableStateHandler>
      </div>
    </div>
  );
}
