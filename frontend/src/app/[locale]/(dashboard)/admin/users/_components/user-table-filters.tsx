"use client";

import { useUsersTableContext } from "./users-table-context";
import { Card, CardContent } from "@/components/ui/card";
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
  const { state, actions } = useUsersTableContext();

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, email, or username..."
              value={state.search}
              onChange={(e) => {
                actions.setSearch(e.target.value);
              }}
              className="w-full rounded-md border border-input bg-background py-2 pr-3 pl-9 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Role:</span>
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
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="trainer">Trainer</SelectItem>
                <SelectItem value="athlete">Athlete</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Period Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Joined:</span>
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
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This week</SelectItem>
                <SelectItem value="month">This month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
