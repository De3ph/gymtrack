"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { adminApi } from "@/lib/api/adminApi";
import { qk } from "@/lib/query-keys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { InfoRow } from "@/components/ui/info-row";
import { DetailPanel } from "@/app/[locale]/(dashboard)/admin/_components/detail-panel";
import {
  Mail,
  User,
  Shield,
  Calendar,
  Lock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export function AdminProfileClient() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const changePasswordMutation = useMutation({
    mutationFn: (data: { oldPassword: string; newPassword: string }) =>
      adminApi.changePassword(data.oldPassword, data.newPassword),
    onSuccess: () => {
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordError("");
      // Bust any cached admin data after credential change
      queryClient.invalidateQueries({ queryKey: qk.admin.all });
    },
    onError: (err: Error) => {
      setPasswordError(err.message);
    },
  });

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");

    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordError("All password fields are required");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    if (oldPassword === newPassword) {
      setPasswordError("New password must differ from current password");
      return;
    }

    changePasswordMutation.mutate({
      oldPassword,
      newPassword,
    });
  };

  if (!user) return null;

  const joinedDate = user.createdAt ? new Date(user.createdAt) : null;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-mono text-3xl leading-tight tracking-[-0.04em]">
          Admin Profile
        </h1>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Your account information and security settings
        </p>
      </div>

      {/* Account Info */}
      <DetailPanel title="Account Information">
        <InfoRow
          icon={Shield}
          label="Role"
          value={
            <Badge
              variant="destructive"
              className="mt-0.5 h-auto rounded-none px-2.5 py-0.5 capitalize"
            >
              {user.role}
            </Badge>
          }
        />

        <InfoRow icon={Mail} label="Email" value={user.email} />

        <InfoRow icon={User} label="Username" value={`@${user.username}`} />

        <InfoRow
          icon={Calendar}
          label="Member Since"
          value={
            joinedDate
              ? joinedDate.toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : "—"
          }
        />
      </DetailPanel>

      {/* Password Change */}
      <div className="border border-border">
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-mono text-[10px] uppercase leading-3 tracking-[0.18em] text-muted-foreground">
            Change Password
          </h2>
          <Lock className="size-5 text-muted-foreground" aria-hidden="true" />
        </header>
        <div className="px-6 py-6">
          <form onSubmit={handlePasswordChange} className="space-y-4">
            {passwordError && (
              <div
                role="alert"
                className="flex items-center gap-2 border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
              >
                <AlertCircle className="size-5 shrink-0" aria-hidden="true" />
                {passwordError}
              </div>
            )}

            {changePasswordMutation.isSuccess && (
              <div className="flex items-center gap-2 border border-accent/40 bg-accent/10 p-3 text-sm text-foreground">
                <CheckCircle2 className="size-5 shrink-0 text-accent" aria-hidden="true" />
                Password changed successfully
              </div>
            )}

            <div>
              <label
                htmlFor="oldPassword"
                className="mb-1.5 block text-sm font-semibold text-muted-foreground"
              >
                Current Password
              </label>
              <Input
                id="oldPassword"
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Enter current password"
                autoComplete="current-password"
              />
            </div>

            <div>
              <label
                htmlFor="newPassword"
                className="mb-1.5 block text-sm font-semibold text-muted-foreground"
              >
                New Password
              </label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 8 characters)"
                autoComplete="new-password"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-1.5 block text-sm font-semibold text-muted-foreground"
              >
                Confirm New Password
              </label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                autoComplete="new-password"
              />
            </div>

            <Button
              type="submit"
              className="w-full rounded-none font-mono text-xs uppercase tracking-[0.18em]"
              disabled={changePasswordMutation.isPending}
            >
              {changePasswordMutation.isPending && (
                <Spinner className="size-5" />
              )}
              {changePasswordMutation.isPending
                ? "Changing Password..."
                : "Change Password"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
