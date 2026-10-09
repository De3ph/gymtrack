'use client';
import React, { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import { MenuView, type MenuAction } from '@expo/ui/community/menu';

import { Fab } from '@/components/ui/fab';
import { Modal, ModalBackdrop, ModalContent } from '@/components/ui/modal';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';

/**
 * `@expo/ui`'s `MenuView` is backed by a real SwiftUI `Menu` on iOS and a
 * Compose `DropdownMenu` on Android. On every other platform it degrades to a
 * plain wrapper that renders the trigger but never fires actions, so a FAB
 * built on it is silently inert in the browser.
 */
const HAS_NATIVE_MENU = Platform.OS === 'ios' || Platform.OS === 'android';

export interface FabMenuAction {
  id: string;
  title: string;
  /** Rendered ahead of the label. Native menus ignore this and use SF Symbols. */
  icon?: React.ReactNode;
}

export interface FabMenuProps {
  actions: FabMenuAction[];
  onSelect: (id: string) => void;
  /** Trigger content, usually an icon. */
  children: React.ReactNode;
  accessibilityLabel: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** Native-only. Rendered as the menu header on iOS. */
  title?: string;
  testID?: string;
}

/**
 * A FAB that reveals a list of actions.
 *
 * On iOS/Android the list is a real native menu. The trigger is made
 * touch-transparent (`pointerEvents="none"`) because both native
 * implementations install their own press handling around the trigger —
 * a `Pressable` trigger would otherwise swallow the gesture and the menu
 * would never open.
 *
 * Elsewhere (notably web) the same trigger opens a JS action sheet, so the
 * FAB is never a dead control.
 */
export function FabMenu({
  actions,
  onSelect,
  children,
  accessibilityLabel,
  size = 'md',
  className,
  title,
  testID,
}: FabMenuProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const nativeActions: MenuAction[] = actions.map((action) => ({
    id: action.id,
    title: action.title,
  }));

  const handleNativeSelect = useCallback(
    (event: { nativeEvent: { event: string } }) => {
      onSelect(event.nativeEvent.event);
    },
    [onSelect]
  );

  const handleSheetSelect = useCallback(
    (id: string) => {
      setSheetOpen(false);
      onSelect(id);
    },
    [onSelect]
  );

  const fab = (
    <Fab
      size={size}
      className={className}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      {...(HAS_NATIVE_MENU ? { pointerEvents: 'none' as const } : {})}
    >
      {children}
    </Fab>
  );

  if (HAS_NATIVE_MENU) {
    return (
      <MenuView
        actions={nativeActions}
        title={title}
        onPressAction={handleNativeSelect}
        testID={testID}
      >
        {fab}
      </MenuView>
    );
  }

  return (
    <>
      <Pressable
        onPress={() => setSheetOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        testID={testID}
        className="items-center justify-center"
      >
        {fab}
      </Pressable>

      <Modal isOpen={sheetOpen} onClose={() => setSheetOpen(false)} size="xs">
        <ModalBackdrop />
        <ModalContent className="p-2">
          {title ? (
            <Text className="px-3 pb-1 pt-2 text-[13px] font-semibold uppercase tracking-wide text-text-tertiary">
              {title}
            </Text>
          ) : null}
          {actions.map((action) => (
            <Pressable
              key={action.id}
              onPress={() => handleSheetSelect(action.id)}
              accessibilityRole="menuitem"
              className="flex-row items-center gap-3 rounded-md px-3 py-3 active:bg-surface-subtle web:hover:bg-surface-subtle web:focus-visible:bg-surface-subtle"
            >
              {action.icon ? <>{action.icon}</> : null}
              <Text className="text-base text-text">{action.title}</Text>
            </Pressable>
          ))}
        </ModalContent>
      </Modal>
    </>
  );
}