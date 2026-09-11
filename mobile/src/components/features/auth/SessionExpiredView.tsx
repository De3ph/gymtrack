import { useCallback, useState } from "react";
import { useRouter } from "expo-router";
import { useI18n } from "@/lib/i18n";
import { useLogout } from "@/hooks/useAuth";
import { Text } from "@/components/ui/text";
import { Button, Host } from "@expo/ui";
import { Center } from "@/components/ui/center";

export function SessionExpiredView({ message }: { message?: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const { mutateAsync: logout } = useLogout();
  const [pending, setPending] = useState(false);

  const handleLogout = useCallback(() => {
    setPending(true);
    logout()
      .catch(() => {})
      .finally(() => {
        setPending(false);
        router.replace("/(auth)/login");
      });
  }, [logout, router]);

  return (
    <Center className="flex-1 bg-background p-6">
      <Text className="mb-4 text-center text-[15px] text-danger">
        {message || t("common.errors.generic")}
      </Text>
      <Host matchContents>
        <Button
          label={t("auth.logout.button")}
          onPress={handleLogout}
          disabled={pending}
        />
      </Host>
    </Center>
  );
}
