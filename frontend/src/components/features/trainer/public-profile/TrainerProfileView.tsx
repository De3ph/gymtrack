"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "@tanstack/react-form";
import PublicProfileField from "./PublicProfileField";
import { TrainerProfile } from "@/types";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface TrainerProfileViewProps {
  profile: TrainerProfile;
  onSave: (profile: TrainerProfile) => void;
  onCancel: () => void;
  saving: boolean;
}

export default function TrainerProfileView({
  profile,
  onSave,
  onCancel,
  saving,
}: TrainerProfileViewProps) {
  const t = useTranslations("trainer.profile.public_profile");
  const [isEditing, setIsEditing] = useState(false);
  const form = useForm({ defaultValues: { ...profile } });

  const handleSave = () => {
    onSave(form.state.values);
    setIsEditing(false);
  };

  const handleCancel = () => {
    onCancel();
    setIsEditing(false);
    form.reset({ ...profile });
  };

  const handleEdit = () => {
    form.reset({ ...profile });
    setIsEditing(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Bio */}
        {isEditing ? (
          <form.Field name="bio">
            {(field) => (
              <PublicProfileField>
                <Label htmlFor="bio">{t("bio")}</Label>
                <Textarea
                  id="bio"
                  placeholder={t("bio_placeholder")}
                  value={field.state.value ?? ""}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </PublicProfileField>
            )}
          </form.Field>
        ) : (
          <PublicProfileField>
            <Label>{t("bio")}</Label>
            <p className="text-gray-700">{profile.bio}</p>
          </PublicProfileField>
        )}

        {/* Hourly Rate */}
        {isEditing ? (
          <form.Field name="hourlyRate">
            {(field) => (
              <PublicProfileField>
                <Label htmlFor="hourlyRate">{t("hourly_rate")}</Label>
                <Input
                  id="hourlyRate"
                  type="number"
                  value={field.state.value ?? ""}
                  onChange={(e) => field.handleChange(Number(e.target.value))}
                />
              </PublicProfileField>
            )}
          </form.Field>
        ) : (
          <PublicProfileField>
            <Label>{t("hourly_rate")}</Label>
            <div className="text-gray-700">
              {profile.hourlyRate ? t("hourly_rate_format", { rate: profile.hourlyRate }) : t("not_set")}
            </div>
          </PublicProfileField>
        )}

        {/* Years of Experience */}
        {isEditing ? (
          <form.Field name="yearsOfExperience">
            {(field) => (
              <PublicProfileField>
                <Label htmlFor="yearsOfExperience">
                  {t("years_of_experience")}
                </Label>
                <Input
                  id="yearsOfExperience"
                  type="number"
                  value={field.state.value ?? ""}
                  onChange={(e) => field.handleChange(Number(e.target.value))}
                />
              </PublicProfileField>
            )}
          </form.Field>
        ) : (
          <PublicProfileField>
            <Label>{t("years_of_experience")}</Label>
            <div className="text-gray-700">
              {profile.yearsOfExperience ?? t("not_set")}
            </div>
          </PublicProfileField>
        )}

        {/* Location */}
        {isEditing ? (
          <form.Field name="location">
            {(field) => (
              <PublicProfileField>
                <Label htmlFor="location">{t("location")}</Label>
                <Input
                  id="location"
                  placeholder={t("location_placeholder")}
                  value={field.state.value ?? ""}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </PublicProfileField>
            )}
          </form.Field>
        ) : (
          <PublicProfileField>
            <Label>{t("location")}</Label>
            <div className="text-gray-700">
              {profile.location ?? t("not_set")}
            </div>
          </PublicProfileField>
        )}

        {/* Languages */}
        {isEditing ? (
          <form.Field name="languages">
            {(field) => (
              <PublicProfileField>
                <Label htmlFor="languages">{t("languages")}</Label>
                <Input
                  id="languages"
                  placeholder={t("languages_placeholder")}
                  value={(field.state.value ?? []).join(", ")}
                  onChange={(e) => {
                    const val = e.target.value;
                    const arr = val
                      .split(",")
                      .map((s) => s.trim())
                      .filter((s) => s);
                    field.handleChange(arr);
                  }}
                />
              </PublicProfileField>
            )}
          </form.Field>
        ) : (
          <PublicProfileField>
            <Label>{t("languages")}</Label>
            <div className="text-gray-700">
              {profile.languages?.length
                ? profile.languages.join(", ")
                : t("not_set")}
            </div>
          </PublicProfileField>
        )}

        {/* Availability */}
        {isEditing ? (
          <form.Field name="isAvailableForNewClients">
            {(field) => (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isAvailable"
                  checked={field.state.value ?? true}
                  onCheckedChange={(checked) =>
                    field.handleChange(checked === true)
                  }
                />
                <Label htmlFor="isAvailable">{t("available")}</Label>
              </div>
            )}
          </form.Field>
        ) : (
          <PublicProfileField>
            <Label>{t("available")}</Label>
            <div className="flex items-center gap-2">
              <Checkbox
                id="isAvailable"
                checked={profile.isAvailableForNewClients ?? true}
                disabled={true}
              />
              <Label htmlFor="isAvailable">{t("available")}</Label>
            </div>
          </PublicProfileField>
        )}

        <div className="flex justify-end gap-2">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={saving}
              >
                {t("cancel")}
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? t("saving") : t("save")}
              </Button>
            </>
          ) : (
            <Button onClick={handleEdit}>{t("edit_profile")}</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
