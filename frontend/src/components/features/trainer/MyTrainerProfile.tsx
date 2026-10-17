import { Mail, Award, Users } from "lucide-react";
import type { User } from "@/types";
import { useTranslations } from "next-intl";

interface MyTrainerProfileProps {
  trainer: User;
}

export function MyTrainerProfile({ trainer }: MyTrainerProfileProps) {
  const t = useTranslations('trainer.profile.my_profile')
  // trainer.profile is optional in generated type - provide fallbacks
  const profile = trainer.profile ?? {};
  return (
    <div className="rounded-none border border-border">
      <div className="px-6 py-4 border-b border-border">
        <h3 className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          <Users className="h-5 w-5" aria-hidden="true" />
          {t('title')}
        </h3>
      </div>
      <div className="p-6 space-y-4">
        <div>
          <span className="text-sm font-[500] text-muted-foreground block">
            {t('name_label')}
          </span>
          <p className="mt-1 text-base font-[600] text-foreground">
            {profile.name}
          </p>
        </div>

        <div>
          <span className="text-sm font-[500] text-muted-foreground block">
            {t('email_label')}
          </span>
          <div className="mt-1 flex items-center gap-2">
            <Mail className="size-5 text-muted-foreground" aria-hidden="true" />
            <p className="text-foreground">{trainer.email}</p>
          </div>
        </div>

        {profile.certifications ? (
          <div>
            <span className="text-sm font-[500] text-muted-foreground block">
              {t('certifications_label')}
            </span>
            <div className="mt-1 flex items-start gap-2">
              <Award className="size-5 text-muted-foreground mt-0.5" aria-hidden="true" />
              <p className="text-foreground">
                {profile.certifications}
              </p>
            </div>
          </div>
        ) : null}

        {profile.specializations ? (
          <div>
            <span className="text-sm font-[500] text-muted-foreground block">
              {t('specializations_label')}
            </span>
            <p className="mt-1 text-foreground">
              {profile.specializations}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
