import { useState } from "react";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import { Icon, StarIcon } from "@/components/ui/icon";

interface StarRatingInputProps {
  value: number;
  onChange: (rating: number) => void;
  size?: number;
  disabled?: boolean;
  label?: string;
}

const MAX_RATING = 5;

function mapIconSize(px: number): "2xs" | "xs" | "sm" | "md" | "lg" | "xl" {
  if (px <= 12) return "2xs";
  if (px <= 16) return "xs";
  if (px <= 20) return "sm";
  if (px <= 24) return "md";
  if (px <= 32) return "lg";
  return "xl";
}

/**
 * Tappable 1-5 star rating picker. Reusable across review flows.
 */
export function StarRatingInput({
  value,
  onChange,
  size = 32,
  disabled = false,
  label,
}: StarRatingInputProps) {
  const [hover, setHover] = useState(0);
  const display = hover || value;

  return (
    <Box className="gap-1.5">
      {label ? (
        <Text className="text-sm font-semibold text-text">{label}</Text>
      ) : null}
      <Box className="flex-row gap-1">
        {Array.from({ length: MAX_RATING }, (_, i) => {
          const star = i + 1;
          const filled = star <= display;
          return (
            <Pressable
              key={star}
              onPress={() => !disabled && onChange(star)}
              onPressIn={() => !disabled && setHover(star)}
              onPressOut={() => setHover(0)}
              disabled={disabled}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              accessibilityRole="button"
              accessibilityLabel={`${star} star${star > 1 ? "s" : ""}`}
              accessibilityState={{ selected: star === value, disabled }}
            >
              {({ pressed }) => (
                <Icon
                  as={StarIcon}
                  size={mapIconSize(size)}
                  className={`${filled ? "text-warning" : "text-neutral-300 dark:text-neutral-700"} ${disabled ? "opacity-50" : ""} ${pressed && !disabled ? "opacity-70" : ""}`}
                />
              )}
            </Pressable>
          );
        })}
      </Box>
    </Box>
  );
}
