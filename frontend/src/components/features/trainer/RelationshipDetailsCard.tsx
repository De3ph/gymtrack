import dayjs from "dayjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import type { Relationship } from "@/types";

interface RelationshipDetailsCardProps {
  relationship: Relationship;
}

export function RelationshipDetailsCard({ relationship }: RelationshipDetailsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Relationship Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
            Status
          </label>
          <p className="mt-1">
            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
              Active
            </span>
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
            Connected Since
          </label>
          <p className="mt-1 text-gray-900 dark:text-white">
            {dayjs(relationship.createdAt).format("MMM D, YYYY")}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
            Relationship ID
          </label>
          <p className="mt-1 text-sm font-mono text-gray-600 dark:text-gray-400">
            {relationship.relationshipId}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
