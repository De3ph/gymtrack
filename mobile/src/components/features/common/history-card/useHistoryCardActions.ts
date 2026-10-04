import { useCallback } from "react";
import { Alert, type AccessibilityActionEvent } from "react-native";

import { triggerHaptic } from "@/lib/haptics";

export interface HistoryCardActionLabels {
  edit: string;
  delete: string;
  cancel: string;
}

export interface HistoryCardActionsOptions {
  /** False hides every affordance: no long press, no a11y actions. */
  enabled: boolean;
  /** Title and subtitle of the action sheet. */
  alertTitle: string;
  alertMessage: string;
  labels: HistoryCardActionLabels;
  onEdit: () => void;
  onDelete: () => void;
  onOpen: () => void;
}

export interface HistoryCardActions {
  onPress: () => void;
  onLongPress: (() => void) | undefined;
  accessibilityActions: readonly { name: string }[] | undefined;
  onAccessibilityAction:
    | ((event: AccessibilityActionEvent) => void)
    | undefined;
}

/**
 * Interaction policy shared by every history card: haptic press, long-press
 * action sheet and the VoiceOver edit/delete actions.
 *
 * Kept out of the presentational card so policy is testable in isolation and
 * new consumers can opt out by passing `enabled: false`.
 */
export function useHistoryCardActions({
  enabled,
  alertTitle,
  alertMessage,
  labels,
  onEdit,
  onDelete,
  onOpen,
}: HistoryCardActionsOptions): HistoryCardActions {
  const openActions = useCallback(() => {
    Alert.alert(alertTitle, alertMessage, [
      { text: labels.edit, onPress: onEdit },
      { text: labels.delete, style: "destructive", onPress: onDelete },
      { text: labels.cancel, style: "cancel" },
    ]);
  }, [alertTitle, alertMessage, labels, onEdit, onDelete]);

  const handlePress = useCallback(() => {
    if (enabled) triggerHaptic();
    onOpen();
  }, [enabled, onOpen]);

  const handleAccessibilityAction = useCallback(
    (event: AccessibilityActionEvent) => {
      switch (event.nativeEvent.actionName) {
        case "edit":
          onEdit();
          break;
        case "delete":
          onDelete();
          break;
      }
    },
    [onEdit, onDelete],
  );

  return {
    onPress: handlePress,
    onLongPress: enabled ? openActions : undefined,
    accessibilityActions: enabled
      ? [{ name: "edit" }, { name: "delete" }]
      : undefined,
    onAccessibilityAction: enabled ? handleAccessibilityAction : undefined,
  };
}