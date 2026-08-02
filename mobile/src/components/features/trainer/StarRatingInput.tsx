import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

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
  const [hover, setHover] = useState(0);
  const display = hover || value;

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.row}>
        {Array.from({ length: MAX_RATING }, (_, i) => {
          const star = i + 1;
          const filled = star <= display;
          return (
            <TouchableOpacity
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
              <Text
                style={[
                  styles.star,
                  { fontSize: size, color: filled ? "#f59e0b" : "#d1d5db" },
                  disabled && styles.disabled,
                ]}
              >
                ★
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 14, fontWeight: "600", color: "#374151" },
  row: { flexDirection: "row", gap: 4 },
  star: { fontWeight: "800" },
  disabled: { opacity: 0.5 },
});
