import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import type { Relationship } from "@/types";

interface RelationshipDetailsCardProps {
  relationship: Relationship;
}

export function RelationshipDetailsCard({ relationship }: RelationshipDetailsCardProps) {
  const t = useTranslations("trainer.client_detail");
  const tCommon = useTranslations("common.status");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {t("relationship_details")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
            {t("status")}
          </label>
          <p className="mt-1">
            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
              {tCommon("active")}
            </span>
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
            {t("connected_since")}
          </label>
          <p className="mt-1 text-gray-900 dark:text-white">
            {dayjs(relationship.createdAt).format("MMM D, YYYY")}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
            {t("relationship_id")}
          </label>
          <p className="mt-1 text-sm font-mono text-gray-600 dark:text-gray-400">
            {relationship.relationshipId}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
