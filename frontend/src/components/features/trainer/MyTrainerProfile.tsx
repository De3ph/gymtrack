import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Award, Users } from "lucide-react";
import type { User } from "@/types";

interface MyTrainerProfileProps {
  trainer: User;
}

export function MyTrainerProfile({ trainer }: MyTrainerProfileProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Trainer Profile
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
            Name
          </label>
          <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
            {trainer.profile.name}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
            Email
          </label>
          <div className="mt-1 flex items-center gap-2">
            <Mail className="h-4 w-4 text-gray-400" />
            <p className="text-gray-900 dark:text-white">{trainer.email}</p>
          </div>
        </div>

        {trainer.profile.certifications ? (
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
              Certifications
            </label>
            <div className="mt-1 flex items-start gap-2">
              <Award className="h-4 w-4 text-gray-400 mt-0.5" />
              <p className="text-gray-900 dark:text-white">
                {trainer.profile.certifications}
              </p>
            </div>
          </div>
        ) : null}

        {trainer.profile.specializations ? (
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
              Specializations
            </label>
            <p className="mt-1 text-gray-900 dark:text-white">
              {trainer.profile.specializations}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
