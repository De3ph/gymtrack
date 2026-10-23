"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
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
  const t = useTranslations("admin.profile");
  const tRoles = useTranslations("admin.roles");
  const locale = useLocale();
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
      setPasswordError(t("errors.required"));
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError(t("errors.min_length"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(t("errors.mismatch"));
      return;
    }

    if (oldPassword === newPassword) {
      setPasswordError(t("errors.same_as_current"));
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
          {t("title")}
        </h1>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {t("description")}
        </p>
      </div>

      {/* Account Info */}
      <DetailPanel title={t("account_information")}>
        <InfoRow
          icon={Shield}
          label={t("role")}
          value={
            <Badge
              variant="destructive"
              className="mt-0.5 h-auto rounded-none px-2.5 py-0.5 capitalize"
            >
              {tRoles(user.role)}
            </Badge>
          }
        />

        <InfoRow icon={Mail} label={t("email")} value={user.email} />

        <InfoRow icon={User} label={t("username")} value={`@${user.username}`} />

        <InfoRow
          icon={Calendar}
          label={t("member_since")}
          value={
            joinedDate
              ? joinedDate.toLocaleDateString(locale, {
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
            {t("change_password")}
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
                {t("password_changed")}
              </div>
            )}

            <div>
              <label
                htmlFor="oldPassword"
                className="mb-1.5 block text-sm font-semibold text-muted-foreground"
              >
                {t("current_password.label")}
              </label>
              <Input
                id="oldPassword"
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder={t("current_password.placeholder")}
                autoComplete="current-password"
              />
            </div>

            <div>
              <label
                htmlFor="newPassword"
                className="mb-1.5 block text-sm font-semibold text-muted-foreground"
              >
                {t("new_password.label")}
              </label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t("new_password.placeholder")}
                autoComplete="new-password"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-1.5 block text-sm font-semibold text-muted-foreground"
              >
                {t("confirm_password.label")}
              </label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t("confirm_password.placeholder")}
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
                ? t("submitting")
                : t("submit")}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
