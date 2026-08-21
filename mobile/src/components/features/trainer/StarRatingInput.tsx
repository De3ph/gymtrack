import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useThemeColors } from "@/components/useThemeColors";
import type { ThemeColors } from "@/constants/Colors";

interface StarRatingInputProps {
  value: number;
  onChange: (rating: number) => void;
  size?: number;
  disabled?: boolean;
  label?: string;
}

const MAX_RATING = 5;

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
  const c = useThemeColors();
  const [hover, setHover] = useState(0);
  const display = hover || value;

  const styles = createStyles(c);

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.row}>
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
                <Text
                  style={[
                    styles.star,
                    { fontSize: size, color: filled ? c.warning : c.borderStrong },
                    disabled && styles.disabled,
                    pressed && !disabled && styles.pressed,
                  ]}
                >
                  ★
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    wrap: { gap: 6 },
    label: { fontSize: 14, fontWeight: "600", color: c.textBody },
    row: { flexDirection: "row", gap: 4 },
    star: { fontWeight: "800" },
    disabled: { opacity: 0.5 },
    pressed: { opacity: 0.7 },
  });
}