"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { adminApi } from "@/lib/api/adminApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { InfoRow } from "@/components/ui/info-row";
import { DetailSection } from "@/components/ui/detail-section";
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
      queryClient.invalidateQueries({ queryKey: ["admin"] });
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

  const joinedDate = new Date(user.createdAt);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Profile</h1>
        <p className="mt-1 text-muted-foreground">
          Your account information and security settings
        </p>
      </div>

      {/* Account Info */}
      <DetailSection title="Account Information">
        <InfoRow
          icon={Shield}
          label="Role"
          value={
            <Badge variant="destructive" className="mt-0.5 capitalize">
              {user.role}
            </Badge>
          }
        />

        <InfoRow icon={Mail} label="Email" value={user.email} />

        <InfoRow icon={User} label="Username" value={`@${user.username}`} />

        <InfoRow
          icon={Calendar}
          label="Member Since"
          value={joinedDate.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        />
      </DetailSection>

      {/* Password Change */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            {passwordError && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {passwordError}
              </div>
            )}

            {changePasswordMutation.isSuccess && (
              <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Password changed successfully
              </div>
            )}

            <div>
              <label
                htmlFor="oldPassword"
                className="mb-1.5 block text-sm font-medium text-muted-foreground"
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
                className="mb-1.5 block text-sm font-medium text-muted-foreground"
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
                className="mb-1.5 block text-sm font-medium text-muted-foreground"
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
              className="w-full"
              disabled={changePasswordMutation.isPending}
            >
              {changePasswordMutation.isPending
                ? "Changing Password..."
                : "Change Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
