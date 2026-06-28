"use client";

import { flexRender, createColumnHelper } from "@tanstack/react-table";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Users,
  Eye,
} from "lucide-react";
import { UsersTableProvider } from "./users-table-provider";
import { UserTableFilters } from "./user-table-filters";
import { UsersTableStateHandler } from "./users-table-state-handler";
import { UsersTablePagination } from "./users-table-pagination";
import { useUsersTableContext } from "./users-table-context";

const columnHelper = createColumnHelper<AdminUserListItem>();

const roleBadgeVariant: Record<
  string,
  "default" | "secondary" | "outline" | "destructive" | "ghost"
> = {
  admin: "destructive",
  trainer: "default",
  athlete: "secondary",
};

const columns = [
  columnHelper.accessor("username", {
    header: ({ column }) => (
      <button
        onClick={() => column.toggleSorting()}
        className="flex items-center gap-1 font-medium"
      >
        Username
        {column.getIsSorted() === "asc" ? (
          <ArrowUp className="h-3 w-3" />
        ) : column.getIsSorted() === "desc" ? (
          <ArrowDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </button>
    ),
    cell: (info) => (
      <span className="font-medium">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor("email", {
    header: "Email",
    cell: (info) => (
      <span className="text-muted-foreground">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor("role", {
    header: ({ column }) => (
      <button
        onClick={() => column.toggleSorting()}
        className="flex items-center gap-1 font-medium"
      >
        Role
        {column.getIsSorted() === "asc" ? (
          <ArrowUp className="h-3 w-3" />
        ) : column.getIsSorted() === "desc" ? (
          <ArrowDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </button>
    ),
    cell: (info) => (
      <Badge variant={roleBadgeVariant[info.getValue()] ?? "outline"}>
        {info.getValue()}
      </Badge>
    ),
  }),
  columnHelper.accessor("profile.name", {
    id: "name",
    header: "Name",
    cell: (info) => info.getValue() || "—",
  }),
  columnHelper.accessor("createdAt", {
    header: ({ column }) => (
      <button
        onClick={() => column.toggleSorting()}
        className="flex items-center gap-1 font-medium"
      >
        Joined
        {column.getIsSorted() === "asc" ? (
          <ArrowUp className="h-3 w-3" />
        ) : column.getIsSorted() === "desc" ? (
          <ArrowDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </button>
    ),
    cell: (info) => {
      const date = new Date(info.getValue());
      return (
        <span className="text-muted-foreground">
          {date.toLocaleDateString("en-GB", {
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
    cell: (info) => (
      <span className="flex justify-end">
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Eye className="h-3 w-3" />
          View
        </span>
      </span>
    ),
    enableSorting: false,
  }),
];

export interface UsersTableClientProps {
  initialData: AdminUserListResponse;
}

export function UsersTableClient({ initialData }: UsersTableClientProps) {
  return (
    <UsersTableProvider initialData={initialData} columns={columns}>
      <UsersTableContent />
    </UsersTableProvider>
  );
}

function UsersTableContent() {
  const { state, actions, meta } = useUsersTableContext();
  const { data, filteredUsers, users } = state;
  const table = meta.table;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Users</h1>
        <p className="mt-1 text-muted-foreground">
          {data
            ? `${data.total} registered user${data.total !== 1 ? "s" : ""}`
            : "Manage all registered users"}
        </p>
      </div>

      {/* Filters */}
      <UserTableFilters />

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            {filteredUsers.length === users.length
              ? `${users.length} user${users.length !== 1 ? "s" : ""}`
              : `${filteredUsers.length} of ${users.length} users`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
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
        </CardContent>
      </Card>
    </div>
  );
}
