"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { adminApi } from "@/lib/api/adminApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
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

const roleBadgeVariant: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  admin: "destructive",
  trainer: "default",
  athlete: "secondary",
};

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number | undefined | null;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 rounded-md bg-muted p-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">
          {value ?? <span className="italic text-muted-foreground/60">Not set</span>}
        </p>
      </div>
    </div>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, initializeAuth, isInitialized } =
    useAuthStore();
  const userId = params?.id as string;

  useEffect(() => {
    if (!isInitialized) initializeAuth();
  }, [initializeAuth, isInitialized]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push(ROUTES.LOGIN);
  }, [isAuthenticated, isLoading, router]);

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["admin", "user", userId],
    queryFn: () => adminApi.getUserDetail(userId),
    enabled: isAuthenticated && user?.role === "admin" && !!userId,
  });

  if (!isAuthenticated || isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-lg text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (detailLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: 3 }).map((_, j) => (
                  <Skeleton key={j} className="h-10 w-full" />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <User className="h-12 w-12 text-muted-foreground/50" />
        <p className="text-lg text-muted-foreground">User not found</p>
        <Button variant="outline" onClick={() => router.push(ROUTES.ADMIN_USERS)}>
          Back to Users
        </Button>
      </div>
    );
  }

  const joinedDate = new Date(detail.createdAt);
  const updatedDate = new Date(detail.updatedAt);
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
          <InfoRow icon={Calendar} label="Joined" value={joinedDate.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })} />
        </DetailSection>

        {/* Profile Details */}
        <DetailSection title="Profile">
          {detail.role === "athlete" && (
            <>
              <InfoRow icon={Scale} label="Weight" value={profile.weight ? `${profile.weight} kg` : undefined} />
              <InfoRow icon={Ruler} label="Height" value={profile.height ? `${profile.height} cm` : undefined} />
              <InfoRow icon={Target} label="Fitness Goals" value={profile.fitnessGoals} />
              <InfoRow icon={User} label="Age" value={profile.age ? `${profile.age}` : undefined} />
              <InfoRow icon={Link2} label="Trainer" value={profile.trainerAssignment} />
            </>
          )}
          {detail.role === "trainer" && (
            <>
              <InfoRow icon={Award} label="Certifications" value={profile.certifications} />
              <InfoRow icon={Activity} label="Specializations" value={profile.specializations} />
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
                ? new Date(detail.updatedAt).toLocaleDateString(
                    "en-GB",
                    {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    },
                  )
                : "Never"
            }
          />
        </DetailSection>
      </div>
    </div>
  );
}
