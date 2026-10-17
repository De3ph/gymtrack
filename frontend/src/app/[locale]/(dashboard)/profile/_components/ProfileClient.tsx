"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { userApi, relationshipApi, toUser } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import type { User, UserProfile } from "@/types";
import { AcceptInvitationDialog } from "@/components/features/athlete/AcceptInvitationDialog";
import { MyTrainerButton } from "@/components/features/athlete/MyTrainerButton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, fieldErrorId } from "@/components/ui/field";
import { FieldInfo } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DetailSection } from "@/components/ui/detail-section";
import { InfoRow } from "@/components/ui/info-row";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  User as UserIcon,
  Mail,
  Shield,
  Calendar,
  Cake,
  Scale,
  Ruler,
  Trophy,
  Award,
  Zap,
  Pencil,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Shared date options - formatted through next-intl so it follows the locale. */
const JOINED_DATE_FORMAT = { day: "numeric", month: "long", year: "numeric" } as const;

function getInitials(name?: string): string {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(name?: string): string {
  if (!name) return "bg-muted";
  const colors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-amber-500",
    "bg-emerald-500",
    "bg-teal-500",
    "bg-cyan-500",
    "bg-blue-500",
    "bg-violet-500",
    "bg-purple-500",
    "bg-pink-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------

function ProfileSkeleton({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="flex items-center gap-4">
        <Skeleton className="size-20 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-4 w-36" />
        </div>
      </div>
      <Separator />
      <DetailSection title={title}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </DetailSection>
    </div>
  );
}

// ---------------------------------------------------------------------------
// View mode
// ---------------------------------------------------------------------------

function ProfileView({
  currentUser,
  onEdit,
  t,
  trainerSection,
}: {
  currentUser: User;
  onEdit: () => void;
  t: ReturnType<typeof useTranslations<"profile">>;
  trainerSection: React.ReactNode;
}) {
  const format = useFormatter();
  // currentUser.createdAt is optional in the generated type. Leave it undefined
  // rather than falling back to today - InfoRow already renders "Not set".
  const joinedDate = currentUser.createdAt
    ? new Date(currentUser.createdAt)
    : undefined;
  // currentUser.profile is optional in generated type - provide fallbacks
  const profile = currentUser.profile ?? {};
  const initials = getInitials(profile.name);
  const avatarColor = getAvatarColor(profile.name);
  const joinedLabel = joinedDate
    ? format.dateTime(joinedDate, JOINED_DATE_FORMAT)
    : undefined;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Avatar size="lg">
          <AvatarFallback
            className={`${avatarColor} text-base font-semibold text-white`}
          >
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {profile.name}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            @{currentUser.username} &middot; {currentUser.email}
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <Badge variant="default" className="capitalize">
              {currentUser.role}
            </Badge>
            {joinedLabel && (
              <span className="text-xs text-muted-foreground">
                {t("member_since")} {joinedLabel}
              </span>
            )}
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={onEdit}>
          <Pencil className="size-5" />
          {t("edit_profile")}
        </Button>
      </div>

      <Separator />

      {/* Personal Information */}
      <DetailSection title={t("personal_info")}>
        <InfoRow
          icon={UserIcon}
          label={t("fields.name")}
          value={profile.name}
        />

        <InfoRow
          icon={Mail}
          label={t("fields.email")}
          value={currentUser.email}
        />

        <InfoRow
          icon={Shield}
          label={t("fields.role")}
          value={
            <Badge variant="outline" className="ml-0.5 capitalize">
              {currentUser.role}
            </Badge>
          }
        />

        <InfoRow
          icon={Calendar}
          label={t("member_since")}
          value={joinedLabel}
        />

        {currentUser.role === "athlete" && (
          <>
            <InfoRow icon={Cake} label={t("fields.age")} value={profile.age} />

            <InfoRow
              icon={Scale}
              label={t("fields.weight")}
              value={
                profile.weight != null
                  ? `${profile.weight} ${t("units.kg")}`
                  : undefined
              }
            />

            <InfoRow
              icon={Ruler}
              label={t("fields.height")}
              value={
                profile.height != null
                  ? `${profile.height} ${t("units.cm")}`
                  : undefined
              }
            />

            <InfoRow
              icon={Trophy}
              label={t("fields.fitness_goals")}
              value={profile.fitnessGoals}
            />
          </>
        )}

        {currentUser.role === "trainer" && (
          <>
            <InfoRow
              icon={Award}
              label={t("fields.certifications")}
              value={profile.certifications}
            />

            <InfoRow
              icon={Zap}
              label={t("fields.specializations")}
              value={profile.specializations}
            />
          </>
        )}
      </DetailSection>

      {trainerSection}
    </div>
  );
}


// ---------------------------------------------------------------------------
// Edit mode
// ---------------------------------------------------------------------------

function ProfileEdit({
  currentUser,
  onSave,
  onCancel,
  isPending,
  t,
}: {
  currentUser: User;
  onSave: (profile: UserProfile) => void;
  onCancel: () => void;
  isPending: boolean;
  t: ReturnType<typeof useTranslations<"profile">>;
}) {
  // currentUser.profile is optional in generated type - provide fallbacks
  const profile = currentUser.profile ?? {};
  const initials = getInitials(profile.name);
  const avatarColor = getAvatarColor(profile.name);

  const validateRange =
    (min: number, max: number) => (value: string) => {
      if (value.trim() === "") return undefined;
      const parsed = Number(value);
      if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
        return t("validation.out_of_range", { min, max });
      }
      return undefined;
    };

  const form = useForm({
    defaultValues: {
      name: profile.name || "",
      age: profile.age?.toString() || "",
      weight: profile.weight?.toString() || "",
      height: profile.height?.toString() || "",
      fitnessGoals: profile.fitnessGoals || "",
      certifications: profile.certifications || "",
      specializations: profile.specializations || "",
    },
    onSubmit: async ({ value }) => {
      // The backend replaces users.profile wholesale (user_service.go), so the
      // payload must carry every field worth keeping - not just the ones this
      // form renders. Spreading the loaded profile preserves trainerAssignment,
      // clientList, bio, hourlyRate and the fields owned by other pages. Only
      // role-relevant fields are overwritten, so an athlete save can't blank a
      // trainer's certifications (and vice versa).
      const next: UserProfile = { ...profile, name: value.name.trim() };

      if (currentUser.role === "athlete") {
        next.age = value.age ? Number(value.age) : undefined;
        next.weight = value.weight ? Number(value.weight) : undefined;
        next.height = value.height ? Number(value.height) : undefined;
        next.fitnessGoals = value.fitnessGoals;
      }

      if (currentUser.role === "trainer") {
        next.certifications = value.certifications;
        next.specializations = value.specializations;
      }

      onSave(next);
    },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="flex items-start gap-4">
        <Avatar size="lg">
          <AvatarFallback
            className={`${avatarColor} text-base font-semibold text-white`}
          >
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {t("title")}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t("edit_profile")}
          </p>
        </div>
      </div>

      <Separator />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
        className="space-y-6"
      >
        <DetailSection title={t("personal_info")}>
          <form.Field
            name="name"
            validators={{
              onChange: ({ value }) =>
                value.trim().length === 0 ? t("validation.field_required") : undefined,
            }}
          >
            {(field) => (
              <Field>
                <FieldLabel htmlFor="name">{t("fields.name")}</FieldLabel>
                <Input
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  type="text"
                  id="name"
                  aria-describedby={fieldErrorId(field.name)}
                />
                <FieldInfo field={field} />
              </Field>
            )}
          </form.Field>

          {currentUser.role === "athlete" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <form.Field name="age" validators={{ onChange: ({ value }) => validateRange(13, 120)(value) }}>
                  {(field) => (
                    <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
                      <FieldLabel htmlFor="age">{t("fields.age")}</FieldLabel>
                      <Input
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        type="number"
                        inputMode="numeric"
                        step={1}
                        min={13}
                        max={120}
                        id="age"
                        aria-describedby={fieldErrorId(field.name)}
                      />
                      <FieldInfo field={field} />
                    </Field>
                  )}
                </form.Field>
                <form.Field
                  name="weight"
                  validators={{ onChange: ({ value }) => validateRange(20, 500)(value) }}
                >
                  {(field) => (
                    <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
                      <FieldLabel htmlFor="weight">
                        {t("fields.weight")} ({t("units.kg")})
                      </FieldLabel>
                      <Input
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        type="number"
                        inputMode="numeric"
                        step={1}
                        min={20}
                        max={500}
                        id="weight"
                        aria-describedby={fieldErrorId(field.name)}
                      />
                      <FieldInfo field={field} />
                    </Field>
                  )}
                </form.Field>
              </div>

              <form.Field
                name="height"
                validators={{ onChange: ({ value }) => validateRange(50, 300)(value) }}
              >
                {(field) => (
                  <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
                    <FieldLabel htmlFor="height">
                      {t("fields.height")} ({t("units.cm")})
                    </FieldLabel>
                    <Input
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      type="number"
                      inputMode="numeric"
                      step={1}
                      min={50}
                      max={300}
                      id="height"
                      aria-describedby={fieldErrorId(field.name)}
                    />
                    <FieldInfo field={field} />
                  </Field>
                )}
              </form.Field>

              <form.Field name="fitnessGoals">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor="fitnessGoals">
                      {t("fields.fitness_goals")}
                    </FieldLabel>
                    <Textarea
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      id="fitnessGoals"
                      rows={3}
                    />
                  </Field>
                )}
              </form.Field>
            </>
          )}


          {currentUser.role === "trainer" && (
            <>
              <form.Field name="certifications">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor="certifications">
                      {t("fields.certifications")}
                    </FieldLabel>
                    <Input
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      type="text"
                      id="certifications"
                    />
                  </Field>
                )}
              </form.Field>

              <form.Field name="specializations">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor="specializations">
                      {t("fields.specializations")}
                    </FieldLabel>
                    <Input
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      type="text"
                      id="specializations"
                    />
                  </Field>
                )}
              </form.Field>
            </>
          )}
        </DetailSection>

        <div className="flex gap-3">
          <Button type="submit" className="flex-1" disabled={isPending} aria-busy={isPending}>
            {isPending ? t("actions.saving") : t("actions.save")}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onCancel}
            disabled={isPending}
          >
            {t("actions.cancel")}
          </Button>
        </div>
      </form>
    </div>
  );
}


// ---------------------------------------------------------------------------
// Main exported component
// ---------------------------------------------------------------------------

export function ProfileClient() {
  const { user, setUser } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryClient = useQueryClient();
  const t = useTranslations("profile");

  useEffect(() => {
    return () => {
      if (successTimer.current) clearTimeout(successTimer.current);
    };
  }, []);

  const { data: currentUser, isLoading } = useQuery<User>({
    queryKey: ["currentUser"],
    queryFn: async () => toUser(await userApi.getCurrentUser(), user),
    // Seed from the store so the page paints immediately; staleTime below decides
    // whether a refetch happens on mount.
    initialData: user || undefined,
  });

  const { data: trainerData } = useQuery({
    queryKey: ["myTrainer"],
    queryFn: relationshipApi.getMyTrainer,
    enabled: currentUser?.role === "athlete",
  });

  const updateMutation = useMutation({
    mutationFn: userApi.updateCurrentUser,
    onSuccess: (data) => {
      // Fall back to the user we already have rather than inventing role/username,
      // since both drive role-gated UI across the app.
      const safeUser = toUser(data, queryClient.getQueryData<User>(["currentUser"]));
      queryClient.setQueryData(["currentUser"], safeUser);
      setUser(safeUser);
      setIsEditing(false);
      setSuccessMessage(t("profile_saved"));
      if (successTimer.current) clearTimeout(successTimer.current);
      successTimer.current = setTimeout(() => setSuccessMessage(""), 3000);
    },
  });

  const handleSaveProfile = (profile: UserProfile) => {
    updateMutation.mutate({ profile });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  if (isLoading) {
    return <ProfileSkeleton title={t("personal_info")} />;
  }

  if (!currentUser) {
    return (
      <div className="mx-auto max-w-2xl text-center text-muted-foreground">
        {t("not_found")}
      </div>
    );
  }

  const trainerSection =
    currentUser.role === "athlete" ? (
      <DetailSection title={t("trainer")}>
        {trainerData?.activeTrainer ? (
          <MyTrainerButton />
        ) : (
          <AcceptInvitationDialog />
        )}
      </DetailSection>
    ) : null;

  return (
    <>
      {successMessage && (
        <div className="mx-auto mb-6 max-w-2xl">
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 rounded-md bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-400"
          >
            <CheckCircle2 className="size-5 shrink-0" />
            {successMessage}
          </div>
        </div>
      )}

      {updateMutation.isError && (
        <div className="mx-auto mb-6 max-w-2xl">
          <div
            role="alert"
            className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive"
          >
            <AlertCircle className="size-5 shrink-0" />
            {t("update_error")}
          </div>
        </div>
      )}

      {isEditing ? (
        <ProfileEdit
          currentUser={currentUser}
          onSave={handleSaveProfile}
          onCancel={handleCancelEdit}
          isPending={updateMutation.isPending}
          t={t}
        />
      ) : (
        <ProfileView
          currentUser={currentUser}
          onEdit={() => setIsEditing(true)}
          t={t}
          trainerSection={trainerSection}
        />
      )}
    </>
  );
}
