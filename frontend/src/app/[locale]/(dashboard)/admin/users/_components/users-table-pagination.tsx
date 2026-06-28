"use client";

import { useUsersTableContext } from "./users-table-context";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

export function UsersTablePagination() {
  const { state, meta } = useUsersTableContext();
  const table = meta.table;

  return (
    <div className="flex items-center justify-between border-t px-6 py-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>
          Page {state.pagination.pageIndex + 1} of{" "}
          {table.getPageCount()}
        </span>
        <span className="text-muted-foreground/50">|</span>
        <span>
          {table.getRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} rows
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon-xs"
          onClick={() => table.setPageIndex(0)}
          disabled={!table.getCanPreviousPage()}
        >
          <ChevronsLeft className="h-3 w-3" />
        </Button>
        <Button
          variant="outline"
          size="icon-xs"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          <ChevronLeft className="h-3 w-3" />
        </Button>
        <Button
          variant="outline"
          size="icon-xs"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          <ChevronRight className="h-3 w-3" />
        </Button>
        <Button
          variant="outline"
          size="icon-xs"
          onClick={() => table.setPageIndex(table.getPageCount() - 1)}
          disabled={!table.getCanNextPage()}
        >
          <ChevronsRight className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}