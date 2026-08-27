"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  const [detail, setDetail] = useState(initialDetail);
  const [roleOpen, setRoleOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  const joinedDate = new Date(detail.createdAt);
  const profile = detail.profile;

  const handleRoleChange = useCallback(async (newRole: UserRole) => {
    try {
      await adminApi.updateUserRole(detail.userId, newRole);
      await revalidateAdminStatsCache();
      setDetail((prev) => ({ ...prev, role: newRole }));
    } catch {
      // Error handled by API interceptor
    }
    setRoleOpen(false);
  }, [detail.userId]);

  const handleStatusChange = useCallback(async (newStatus: UserStatus) => {
    try {
      await adminApi.updateUserStatus(detail.userId, newStatus);
      await revalidateAdminStatsCache();
      setDetail((prev) => ({ ...prev, status: newStatus }));
    } catch {
      // Error handled by API interceptor
    }
    setStatusOpen(false);
  }, [detail.userId]);

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(ROUTES.ADMIN_USERS)}
          aria-label="Back to users"
        >
          <ArrowLeft className="size-4" />
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
                {detail.role}
              </Badge>
              {detail.status && detail.status !== "active" && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <Badge
                    variant={statusBadgeVariant[detail.status] ?? "outline"}
                    className={badgeRegister}
                  >
                    {detail.status}
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
        <DetailPanel title="Account">
          <InfoRow icon={Mail} label="Email" value={detail.email} />
          <InfoRow icon={User} label="Username" value={detail.username} />
          <InfoRow icon={Shield} label="Role" value={detail.role} />
          <InfoRow
            icon={Calendar}
            label="Joined"
            value={joinedDate.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          />
        </DetailPanel>

        {/* Profile Details */}
        <DetailPanel title="Profile">
          {detail.role === "athlete" && (
            <>
              <InfoRow
                icon={Scale}
                label="Weight"
                value={profile.weight ? `${profile.weight} kg` : undefined}
              />
              <InfoRow
                icon={Ruler}
                label="Height"
                value={profile.height ? `${profile.height} cm` : undefined}
              />
              <InfoRow
                icon={Target}
                label="Fitness Goals"
                value={profile.fitnessGoals}
              />
              <InfoRow
                icon={User}
                label="Age"
                value={profile.age ? `${profile.age}` : undefined}
              />
              <InfoRow
                icon={Link2}
                label="Trainer"
                value={profile.trainerAssignment}
              />
            </>
          )}
          {detail.role === "trainer" && (
            <>
              <InfoRow
                icon={Award}
                label="Certifications"
                value={profile.certifications}
              />
              <InfoRow
                icon={Activity}
                label="Specializations"
                value={profile.specializations}
              />
            </>
          )}
          {detail.role === "admin" && (
            <p className="text-sm leading-6 text-muted-foreground">
              Full system access. No profile restrictions.
            </p>
          )}
        </DetailPanel>

        {/* Activity + Admin Actions */}
        <div className="space-y-6">
          <DetailPanel title="Activity">
            <InfoRow
              icon={Calendar}
              label="Last Updated"
              value={
                detail.updatedAt
                  ? new Date(detail.updatedAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Never"
              }
            />
          </DetailPanel>

          {/* Admin Actions */}
          <div className="border border-border">
            <header className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="font-mono text-[10px] uppercase leading-3 tracking-[0.18em] text-muted-foreground">
                Admin Actions
              </h2>
              <AlertTriangle
                className="size-3.5 text-muted-foreground"
                aria-hidden="true"
              />
            </header>
            <div className="space-y-4 px-6 py-6">
              {/* Role Change */}
              <div className="space-y-2">
                <label className="font-mono text-[10px] uppercase leading-3 tracking-[0.18em] text-muted-foreground">
                  Change Role
                </label>
                <Dialog open={roleOpen} onOpenChange={setRoleOpen}>
                  <DialogTrigger className="inline-flex w-full items-center justify-start gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-semibold text-foreground hover:bg-muted">
                    <Shield className="size-3" />
                    {detail.role}
                  </DialogTrigger>
                  <DialogContent className="rounded-none border border-border shadow-none">
                    <DialogHeader>
                      <DialogTitle>Change User Role</DialogTitle>
                      <DialogDescription>
                        Select a new role for @{detail.username}.
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
                            {role}
                          </Button>
                        ),
                      )}
                    </div>
                    <DialogFooter>
                      <Button
                        variant="ghost"
                        onClick={() => setRoleOpen(false)}
                      >
                        Cancel
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Status Change */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">
                  Account Status
                </label>
                <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
                  <DialogTrigger
                    className={`inline-flex w-full items-center justify-start gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-semibold hover:bg-muted ${
                      detail.status === "banned" ? "text-destructive" : "text-foreground"
                    }`}
                  >
                    {detail.status || "active"}
                  </DialogTrigger>
                  <DialogContent className="rounded-none border border-border shadow-none">
                    <DialogHeader>
                      <DialogTitle>Change Account Status</DialogTitle>
                      <DialogDescription>
                        {detail.status === "active"
                          ? "Suspend or ban this account?"
                          : "Reactivate this account?"}
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
                          {status}
                        </Button>
                      ))}
                    </div>
                    <DialogFooter>
                      <Button
                        variant="ghost"
                        onClick={() => setStatusOpen(false)}
                      >
                        Cancel
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
