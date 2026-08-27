"use client";

import TrainerProfileView from "@/components/features/trainer/public-profile/TrainerProfileView";
import AvailabilityCard from "@/components/features/trainer/AvailabilityCard";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { TrainerProfile } from "@/types";
import { trainerCatalogApi } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { revalidateTrainerProfileCache } from "@/lib/actions/cache";
import { cn } from "@/lib/utils";

interface TrainerProfileClientProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialProfile: any;
}

export function TrainerProfileClient({
  initialProfile,
}: TrainerProfileClientProps) {
  const [message, setMessage] = useState("");
  const t = useTranslations("trainer.profile");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (profile: TrainerProfile) =>
      trainerCatalogApi.updateTrainerProfile(profile),
    onSuccess: async () => {
      await revalidateTrainerProfileCache();
      queryClient.invalidateQueries({ queryKey: ["myTrainerProfile"] });
      setMessage(t("profile_saved"));
      setTimeout(() => setMessage(""), 3000);
    },
    onError: () => {
      setMessage(t("profile_save_failed"));
    },
  });

  const handleSave = (profile: TrainerProfile) => {
    setMessage("");
    mutation.mutate(profile);
  };

  const handleCancel = () => {
    setMessage("");
  };

  const profile: TrainerProfile = (initialProfile?.profile as TrainerProfile) || {};
  const isError = message.includes(t("profile_save_failed"));

  return (
    <div className="container mx-auto py-8">
      <h1 className="mb-8 text-2xl font-semibold tracking-tight text-foreground">
        {t("title")}
      </h1>

      {message && (
        <div
          role="alert"
          className={cn(
            "mb-4 border px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em]",
            isError
              ? "border-destructive text-destructive"
              : "border-foreground text-foreground",
          )}
        >
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <TrainerProfileView
          profile={profile}
          onSave={handleSave}
          onCancel={handleCancel}
          saving={mutation.isPending}
        />
        <AvailabilityCard onMessage={setMessage} />
      </div>
    </div>
  );
}
