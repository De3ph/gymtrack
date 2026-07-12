"use client";

import TrainerProfileView from "@/components/features/trainer/public-profile/TrainerProfileView";
import AvailabilityCard from "@/components/features/trainer/AvailabilityCard";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { TrainerProfile } from "@/types";
import { trainerCatalogApi } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface TrainerProfileClientProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialProfile: any;
}

export function TrainerProfileClient({ initialProfile }: TrainerProfileClientProps) {
  const [message, setMessage] = useState("");
  const t = useTranslations("trainer.profile");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (profile: TrainerProfile) => trainerCatalogApi.updateTrainerProfile(profile),
    onSuccess: () => {
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

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">{t("title")}</h1>

      {message && (
        <div
          className={`mb-4 p-3 rounded ${
            message.includes(t("profile_save_failed"))
              ? "bg-red-100 text-red-800"
              : "bg-green-100 text-green-800"
          }`}
        >
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
