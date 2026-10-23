"use client";

import { useTranslations } from "next-intl";
import { useUsersTableContext } from "./users-table-context";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

export function UsersTablePagination() {
  const t = useTranslations("admin.users.pagination");
  const { state, meta } = useUsersTableContext();
  const table = meta.table;

  return (
    <div className="flex items-center justify-between border-t px-6 py-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>
          {t("page_of", {
            page: state.pagination.pageIndex + 1,
            pages: table.getPageCount(),
          })}
        </span>
        <span className="text-muted-foreground/50">|</span>
        <span>
          {t("rows_of", {
            shown: table.getRowModel().rows.length,
            total: table.getFilteredRowModel().rows.length,
          })}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon-xs"
          onClick={() => table.setPageIndex(0)}
          disabled={!table.getCanPreviousPage()}
          aria-label={t("first")}
        >
          <ChevronsLeft className="h-3 w-3" />
        </Button>
        <Button
          variant="outline"
          size="icon-xs"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          aria-label={t("previous")}
        >
          <ChevronLeft className="h-3 w-3" />
        </Button>
        <Button
          variant="outline"
          size="icon-xs"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          aria-label={t("next")}
        >
          <ChevronRight className="h-3 w-3" />
        </Button>
        <Button
          variant="outline"
          size="icon-xs"
          onClick={() => table.setPageIndex(table.getPageCount() - 1)}
          disabled={!table.getCanNextPage()}
          aria-label={t("last")}
        >
          <ChevronsRight className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
