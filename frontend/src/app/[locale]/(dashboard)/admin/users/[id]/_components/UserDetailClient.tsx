"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import { InfoRow } from "@/components/ui/info-row";
import { DetailSection } from "@/components/ui/detail-section";
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
} from "lucide-react";
import type { AdminUserListItem } from "@/lib/api/adminApi";

const roleBadgeVariant: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  admin: "destructive",
  trainer: "default",
  athlete: "secondary",
};

export interface UserDetailClientProps {
  detail: AdminUserListItem;
}

export function UserDetailClient({ detail }: UserDetailClientProps) {
  const router = useRouter();

  const joinedDate = new Date(detail.createdAt);
  const profile = detail.profile;

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(ROUTES.ADMIN_USERS)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white ${
              detail.role === "admin"
                ? "bg-destructive"
                : detail.role === "trainer"
                  ? "bg-primary"
                  : "bg-accent"
            }`}
          >
            {(profile.name || detail.username).charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold">
              {profile.name || detail.username}
            </h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>@{detail.username}</span>
              <span className="text-muted-foreground/40">·</span>
              <Badge
                variant={roleBadgeVariant[detail.role] ?? "outline"}
                className="capitalize"
              >
                {detail.role}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Account Info */}
        <DetailSection title="Account">
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
        </DetailSection>

        {/* Profile Details */}
        <DetailSection title="Profile">
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
            <p className="text-sm text-muted-foreground italic">
              Full system access. No profile restrictions.
            </p>
          )}
        </DetailSection>

        {/* Activity */}
        <DetailSection title="Activity">
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
        </DetailSection>
      </div>
    </div>
  );
}
