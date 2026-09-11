import { memo } from "react";
import { useI18n } from "@/lib/i18n";
import { useThemeStore, type ThemeSetting } from "@/stores/themeStore";
import { Card } from "@/components/ui/card";
import { Divider } from "@/components/ui/divider";
import { Text } from "@/components/ui/text";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import {
  Radio,
  RadioGroup,
  RadioIndicator,
  RadioLabel,
} from "@/components/ui/radio";
import { Icon, MoonIcon, SettingsIcon, SunIcon } from "@/components/ui/icon";

const sectionTitleClassName =
  "text-xs font-bold uppercase tracking-[1.5px] text-text-secondary";
const ledgerIndexClassName =
  "text-[11px] font-black tabular-nums text-text-tertiary";

const THEME_OPTIONS: {
  value: ThemeSetting;
  icon: React.ComponentType<Record<string, unknown>>;
}[] = [
  { value: "system", icon: SettingsIcon },
  { value: "light", icon: SunIcon },
  { value: "dark", icon: MoonIcon },
];

function ThemeOptionLabel({
  icon,
  label,
}: {
  icon: React.ComponentType<Record<string, unknown>>;
  label: string;
}) {
  return (
    <HStack space="sm" className="items-center">
      <Icon as={icon} size="sm" className="text-text-secondary" />
      <RadioLabel className="text-[15px] font-semibold text-text">
        {label}
      </RadioLabel>
    </HStack>
  );
}

export const ThemeSettingsCard = memo(function ThemeSettingsCard() {
  const { t } = useI18n();
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  return (
    <Card className="border-border-strong">
      <HStack space="sm" className="items-center">
        <Text className={ledgerIndexClassName}>03</Text>
        <Text className={sectionTitleClassName}>
          {t("settings.theme.title")}
        </Text>
        <Divider className="mx-1 flex-1" />
      </HStack>
      <Divider />
      <RadioGroup
        value={theme}
        onChange={(value: string) => setTheme(value as ThemeSetting)}
        accessibilityLabel={t("settings.theme.title")}
        className="mt-1"
      >
        {THEME_OPTIONS.map((option, index) => (
          <Radio
            key={option.value}
            value={option.value}
            size="md"
            className={`rounded-xl px-2 py-2.5 active:bg-surface-subtle ${
              index === THEME_OPTIONS.length - 1 ? "" : "mb-0.5"
            }`}
          >
            <RadioIndicator />
            <ThemeOptionLabel
              icon={option.icon}
              label={t(`settings.theme.${option.value}`)}
            />
          </Radio>
        ))}
      </RadioGroup>
      <Text className="pt-1 text-[11px] font-semibold uppercase tracking-[1px] text-text-tertiary">
        {t("settings.theme.hint")}
      </Text>
    </Card>
  );
});
