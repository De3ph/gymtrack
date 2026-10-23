"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ROUTES } from "@/lib/routes";
import { InfoRow } from "@/components/ui/info-row";
import { DetailPanel } from "@/app/[locale]/(dashboard)/admin/_components/detail-panel";
import { adminApi } from "@/lib/api/adminApi";
import { qk } from "@/lib/query-keys";
import { revalidateAdminStatsCache } from "@/lib/actions/cache";
import {
  ArrowLeft,
  Calendar,
  Mail,
  User,
  Shield,
  Target,
  Award,
  Link2,
  Scale,
  Ruler,
  Activity,
  AlertTriangle,
} from "lucide-react";
import type { AdminUserListItem } from "@/lib/api/adminApi";
import type { UserRole, UserStatus } from "@/types";

const badgeRegister = "h-auto rounded-none px-2.5 py-0.5 capitalize";

const roleBadgeVariant: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  admin: "destructive",
  trainer: "default",
  athlete: "secondary",
};

const statusBadgeVariant: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  active: "default",
  suspended: "outline",
  banned: "destructive",
};

export interface UserDetailClientProps {
  detail: AdminUserListItem;
}

export function UserDetailClient({ detail: initialDetail }: UserDetailClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations("admin.user_detail");
  const tFields = useTranslations("admin.user_detail.fields");
  const tRoles = useTranslations("admin.roles");
  const tStatuses = useTranslations("admin.statuses");
  const tActions = useTranslations("common.actions");
  const locale = useLocale();
  const [detail, setDetail] = useState(initialDetail);
  const [roleOpen, setRoleOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  const joinedDate = new Date(detail.createdAt);
  const profile = detail.profile;

  const roleMutation = useMutation({
    mutationFn: (newRole: UserRole) => adminApi.updateUserRole(detail.userId, newRole),
    onSuccess: async (_data, newRole) => {
      await revalidateAdminStatsCache();
      queryClient.invalidateQueries({ queryKey: qk.admin.users.all });
      setDetail((prev) => ({ ...prev, role: newRole }));
      setRoleOpen(false);
    },
    onSettled: () => setRoleOpen(false),
  });

  const statusMutation = useMutation({
    mutationFn: (newStatus: UserStatus) => adminApi.updateUserStatus(detail.userId, newStatus),
    onSuccess: async (_data, newStatus) => {
      await revalidateAdminStatsCache();
      queryClient.invalidateQueries({ queryKey: qk.admin.users.all });
      setDetail((prev) => ({ ...prev, status: newStatus }));
      setStatusOpen(false);
    },
    onSettled: () => setStatusOpen(false),
  });

  const handleRoleChange = (newRole: UserRole) => {
    roleMutation.mutate(newRole);
  };

  const handleStatusChange = (newStatus: UserStatus) => {
    statusMutation.mutate(newStatus);
  };

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(ROUTES.ADMIN_USERS)}
          aria-label={t("back")}
        >
          <ArrowLeft className="size-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center border border-border font-mono text-sm uppercase">
            {(profile.name || detail.username).charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="font-sans text-2xl font-semibold leading-tight">
              {profile.name || detail.username}
            </h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>@{detail.username}</span>
              <span className="text-muted-foreground/40">·</span>
              <Badge
                variant={roleBadgeVariant[detail.role] ?? "outline"}
                className={badgeRegister}
              >
                {tRoles(detail.role)}
              </Badge>
              {detail.status && detail.status !== "active" && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <Badge
                    variant={statusBadgeVariant[detail.status] ?? "outline"}
                    className={badgeRegister}
                  >
                    {tStatuses(detail.status)}
                  </Badge>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detail Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Account Info */}
        <DetailPanel title={t("account")}>
          <InfoRow icon={Mail} label={tFields("email")} value={detail.email} />
          <InfoRow icon={User} label={tFields("username")} value={detail.username} />
          <InfoRow icon={Shield} label={tFields("role")} value={tRoles(detail.role)} />
          <InfoRow
            icon={Calendar}
            label={tFields("joined")}
            value={joinedDate.toLocaleDateString(locale, {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          />
        </DetailPanel>

        {/* Profile Details */}
        <DetailPanel title={t("profile")}>
          {detail.role === "athlete" && (
            <>
              <InfoRow
                icon={Scale}
                label={tFields("weight")}
                value={profile.weight ? `${profile.weight} kg` : undefined}
              />
              <InfoRow
                icon={Ruler}
                label={tFields("height")}
                value={profile.height ? `${profile.height} cm` : undefined}
              />
              <InfoRow
                icon={Target}
                label={tFields("fitness_goals")}
                value={profile.fitnessGoals}
              />
              <InfoRow
                icon={User}
                label={tFields("age")}
                value={profile.age ? `${profile.age}` : undefined}
              />
              <InfoRow
                icon={Link2}
                label={tFields("trainer")}
                value={profile.trainerAssignment}
              />
            </>
          )}
          {detail.role === "trainer" && (
            <>
              <InfoRow
                icon={Award}
                label={tFields("certifications")}
                value={profile.certifications}
              />
              <InfoRow
                icon={Activity}
                label={tFields("specializations")}
                value={profile.specializations}
              />
            </>
          )}
          {detail.role === "admin" && (
            <p className="text-sm leading-6 text-muted-foreground">
              {t("admin_note")}
            </p>
          )}
        </DetailPanel>

        {/* Activity + Admin Actions */}
        <div className="space-y-6">
          <DetailPanel title={t("activity")}>
            <InfoRow
              icon={Calendar}
              label={tFields("last_updated")}
              value={
                detail.updatedAt
                  ? new Date(detail.updatedAt).toLocaleDateString(locale, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : tFields("never")
              }
            />
          </DetailPanel>

          {/* Admin Actions */}
          <div className="border border-border">
            <header className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="font-mono text-[10px] uppercase leading-3 tracking-[0.18em] text-muted-foreground">
                {t("admin_actions")}
              </h2>
              <AlertTriangle
                className="size-5 text-muted-foreground"
                aria-hidden="true"
              />
            </header>
            <div className="space-y-4 px-6 py-6">
              {/* Role Change */}
              <div className="space-y-2">
                <label className="font-mono text-[10px] uppercase leading-3 tracking-[0.18em] text-muted-foreground">
                  {t("change_role")}
                </label>
                <Dialog open={roleOpen} onOpenChange={setRoleOpen}>
                  <DialogTrigger className="inline-flex w-full items-center justify-start gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-semibold text-foreground hover:bg-muted">
                    <Shield className="size-4" />
                    {tRoles(detail.role)}
                  </DialogTrigger>
                  <DialogContent className="rounded-none border border-border shadow-none">
                    <DialogHeader>
                      <DialogTitle>{t("change_user_role")}</DialogTitle>
                      <DialogDescription>
                        {t("select_role", { username: detail.username })}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                      {(["athlete", "trainer", "admin"] as UserRole[]).map(
                        (role) => (
                          <Button
                            key={role}
                            variant={
                              detail.role === role ? "default" : "outline"
                            }
                            className="w-full justify-start capitalize"
                            onClick={() => handleRoleChange(role)}
                          >
                            {tRoles(role)}
                          </Button>
                        ),
                      )}
                    </div>
                    <DialogFooter>
                      <Button
                        variant="ghost"
                        onClick={() => setRoleOpen(false)}
                      >
                        {tActions("cancel")}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Status Change */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">
                  {t("account_status")}
                </label>
                <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
                  <DialogTrigger
                    className={`inline-flex w-full items-center justify-start gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-semibold hover:bg-muted ${
                      detail.status === "banned" ? "text-destructive" : "text-foreground"
                    }`}
                  >
                    {tStatuses(detail.status || "active")}
                  </DialogTrigger>
                  <DialogContent className="rounded-none border border-border shadow-none">
                    <DialogHeader>
                      <DialogTitle>{t("change_account_status")}</DialogTitle>
                      <DialogDescription>
                        {detail.status === "active"
                          ? t("suspend_or_ban")
                          : t("reactivate")}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                      {(
                        ["active", "suspended", "banned"] as UserStatus[]
                      ).map((status) => (
                        <Button
                          key={status}
                          variant={
                            (detail.status || "active") === status
                              ? "default"
                              : "outline"
                          }
                          className={`w-full justify-start capitalize ${
                            status === "banned" ? "text-destructive" : ""
                          }`}
                          onClick={() => handleStatusChange(status)}
                        >
                          {tStatuses(status)}
                        </Button>
                      ))}
                    </div>
                    <DialogFooter>
                      <Button
                        variant="ghost"
                        onClick={() => setStatusOpen(false)}
                      >
                        {tActions("cancel")}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
