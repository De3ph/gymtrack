import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { Calendar } from "lucide-react";
import type { Relationship } from "@/types";

interface RelationshipDetailsCardProps {
  relationship: Relationship;
}

export function RelationshipDetailsCard({ relationship }: RelationshipDetailsCardProps) {
  const t = useTranslations("trainer.client_detail");
  const tCommon = useTranslations("common.status");

  return (
    <div className="rounded-none border border-border">
      <div className="px-6 py-4 border-b border-border">
        <h3 className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          <Calendar className="h-5 w-5" aria-hidden="true" />
          {t("relationship_details")}
        </h3>
      </div>
      <div className="p-6 space-y-4">
        <div>
          <span className="text-sm font-[500] text-muted-foreground block">
            {t("status")}
          </span>
          <p className="mt-1">
            <span className="inline-flex items-center rounded-none border border-accent bg-accent/10 px-2.5 py-0.5 text-xs text-accent">
              {tCommon("active")}
            </span>
          </p>
        </div>

        <div>
          <span className="text-sm font-[500] text-muted-foreground block">
            {t("connected_since")}
          </span>
          <p className="mt-1 text-foreground">
            {dayjs(relationship.createdAt).format("MMM D, YYYY")}
          </p>
        </div>

        <div>
          <span className="text-sm font-[500] text-muted-foreground block">
            {t("relationship_id")}
          </span>
          <p className="mt-1 text-sm font-mono text-muted-foreground">
            {relationship.relationshipId}
          </p>
        </div>
      </div>
    </div>
  );
}
