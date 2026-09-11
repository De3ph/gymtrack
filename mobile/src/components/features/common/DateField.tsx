import React, { useRef, useState } from "react";
import { Platform } from "react-native";
import { DateTimePicker } from "@expo/ui/community/datetime-picker";
import { useI18n } from "@/lib/i18n";
import { parseDateString, toDateString } from "@/lib/dates";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Input, InputField } from "@/components/ui/input";
import { Pressable } from "@/components/ui/pressable";
import { Icon, CalendarDaysIcon } from "@/components/ui/icon";

interface DateFieldProps {
  /** Controlled value in YYYY-MM-DD format (ISO timestamp prefixes accepted) */
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/**
 * Date input backed by the @expo/ui DateTimePicker (native pickers):
 * graphical inline calendar on iOS, Material 3 dialog on Android.
 * Falls back to a plain text input on web.
 */
export function DateField({ value, onChange, disabled }: DateFieldProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const fallbackDate = useRef(new Date()).current;

  if (Platform.OS === "web") {
    return (
      <Input isDisabled={disabled}>
        <InputField
          value={value}
          onChangeText={onChange}
          placeholder="YYYY-MM-DD"
          autoCapitalize="none"
          editable={!disabled}
        />
      </Input>
    );
  }

  const parsed = parseDateString(value);
  const displayValue = parsed
    ? parsed.toLocaleDateString(undefined, {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric"
      })
    : t("common.date.select");

  const showPicker = open && !disabled;
  const picker = showPicker ? (
    <DateTimePicker
      value={parsed ?? fallbackDate}
      mode="date"
      display="inline"
      onValueChange={(_event, date) => {
        onChange(toDateString(date));
        setOpen(false);
      }}
      onDismiss={() => setOpen(false)}
    />
  ) : null;

  return (
    <Box>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={() => setOpen((prev) => !prev)}
        className={
          "min-h-9 w-full flex-row items-center gap-2 rounded-md border border-border bg-transparent px-3 py-2" +
          (disabled ? " bg-surface-subtle" : "")
        }
      >
        <Icon as={CalendarDaysIcon} size="sm" className="text-text-tertiary" />
        <Text
          className={
            "flex-1 text-sm " + (parsed ? "text-text" : "text-text-tertiary")
          }
        >
          {displayValue}
        </Text>
      </Pressable>

      {showPicker &&
        (Platform.OS === "ios" ? (
          <Box className="mt-2 overflow-hidden rounded-md border border-border bg-card p-3">
            {picker}
          </Box>
        ) : (
          picker
        ))}
    </Box>
  );
}
