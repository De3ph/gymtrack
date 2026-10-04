import { Pressable } from "@/components/ui/pressable";
import { Icon, ThreeDotsIcon } from "@/components/ui/icon";

export interface HistoryCardMenuProps {
  onPress: () => void;
  accessibilityLabel: string;
}

/**
 * Trailing three-dots trigger for {@link HistoryCard}. Split out so the card
 * itself stays free of menu semantics and can render any trailing slot.
 */
export function HistoryCardMenu({
  onPress,
  accessibilityLabel,
}: HistoryCardMenuProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className="h-6 w-6 items-center justify-center active:opacity-50"
    >
      <Icon as={ThreeDotsIcon} size="sm" className="text-text-tertiary" />
    </Pressable>
  );
}