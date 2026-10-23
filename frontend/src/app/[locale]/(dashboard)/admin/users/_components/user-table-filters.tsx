"use client";

import { useTranslations } from "next-intl";
import { useUsersTableContext } from "./users-table-context";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import type { UserRole } from "@/types";

export function UserTableFilters() {
  const t = useTranslations("admin.users.filters");
  const tRoles = useTranslations("admin.roles");
  const { state, actions } = useUsersTableContext();

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder={t("search_placeholder")}
          value={state.search}
          onChange={(e) => {
            actions.setSearch(e.target.value);
          }}
          className="pl-9"
        />
      </div>

      {/* Role Filter */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] uppercase leading-3 tracking-[0.18em] text-muted-foreground">
          {t("role")}
        </span>
        <Select
          value={state.roleFilter}
          onValueChange={(v) => {
            actions.setRoleFilter(v as UserRole | "all");
          }}
        >
          <SelectTrigger className="w-28" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("all")}</SelectItem>
            <SelectItem value="admin">{tRoles("admin")}</SelectItem>
            <SelectItem value="trainer">{tRoles("trainer")}</SelectItem>
            <SelectItem value="athlete">{tRoles("athlete")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Period Filter */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] uppercase leading-3 tracking-[0.18em] text-muted-foreground">
          {t("joined")}
        </span>
        <Select
          value={state.period}
          onValueChange={(v) => {
            actions.setPeriod(v as "all" | "today" | "week" | "month");
          }}
        >
          <SelectTrigger className="w-28" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("all_time")}</SelectItem>
            <SelectItem value="today">{t("today")}</SelectItem>
            <SelectItem value="week">{t("this_week")}</SelectItem>
            <SelectItem value="month">{t("this_month")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
