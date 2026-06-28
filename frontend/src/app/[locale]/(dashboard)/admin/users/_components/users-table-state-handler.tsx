"use client";

import { useUsersTableContext } from "./users-table-context";
import { Loader2, Users } from "lucide-react";

export function UsersTableStateHandler({
  children,
}: {
  children: React.ReactNode;
}) {
  const { state } = useUsersTableContext();
  const { isLoading, error, filteredUsers, users } = state;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-6 py-8 text-center text-destructive">
        {error instanceof Error ? error.message : "Failed to load users"}
      </div>
    );
  }

  if (filteredUsers.length === 0) {
    return (
      <div className="px-6 py-16 text-center">
        <Users className="mx-auto h-8 w-8 text-muted-foreground/50" />
        <p className="mt-3 text-sm text-muted-foreground">
          {users.length === 0
            ? "No users registered yet."
            : "No users match your filters."}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}