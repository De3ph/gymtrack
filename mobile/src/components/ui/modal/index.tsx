'use client';
import React, { createContext, useContext } from 'react';
import {
  Modal as RNModal,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  ZoomIn,
} from 'react-native-reanimated';
import { cn } from '@/lib/utils';

export type ModalSize = 'xs' | 'sm' | 'md' | 'lg' | 'full';

const contentSizeStyles: Record<ModalSize, string> = {
  xs: 'w-[60%] max-w-[360px]',
  sm: 'w-[70%] max-w-[420px]',
  md: 'w-[80%] max-w-[510px]',
  lg: 'w-[90%] max-w-[640px]',
  full: 'w-full',
};

interface ModalContextValue {
  onClose: () => void;
  size: ModalSize;
}

const ModalContext = createContext<ModalContextValue>({
  onClose: () => {},
  size: 'md',
});

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  size?: ModalSize;
  children: React.ReactNode;
  className?: string;
}

function Modal({ isOpen, onClose, size = 'md', children, className }: ModalProps) {
  return (
    <ModalContext.Provider value={{ onClose, size }}>
      <RNModal
        visible={isOpen}
        transparent
        statusBarTranslucent
        animationType="none"
        onRequestClose={onClose}
      >
        <View
          className={cn(
            'group/modal w-full h-full justify-center items-center web:pointer-events-none',
            className,
          )}
          pointerEvents="box-none"
        >
          {children}
        </View>
      </RNModal>
    </ModalContext.Provider>
  );
}

interface ModalBackdropProps {
  className?: string;
}

function ModalBackdrop({ className }: ModalBackdropProps) {
  const { onClose } = useContext(ModalContext);
  return (
    <Pressable
      className={cn(
        'absolute left-0 top-0 right-0 bottom-0 bg-[#000]/50 web:cursor-default',
        className,
      )}
      onPress={onClose}
    />
  );
}

interface ModalContentProps {
  className?: string;
  children: React.ReactNode;
}

function ModalContent({ className, children }: ModalContentProps) {
  const { size } = useContext(ModalContext);
  return (
    <Animated.View
      entering={ZoomIn.duration(200)
        .easing(Easing.out(Easing.ease))
        .withInitialValues({
          transform: [{ scale: 0.9 }],
        })}
      exiting={FadeOut.duration(200).easing(Easing.linear)}
      className={cn(
        'bg-background rounded-md overflow-hidden border border-border/80 shadow-hard-2 p-6',
        contentSizeStyles[size],
        className,
      )}
      pointerEvents="auto"
    >
      {children}
    </Animated.View>
  );
}

interface ModalHeaderProps extends React.ComponentProps<typeof View> {
  className?: string;
}

function ModalHeader({ className, ...props }: ModalHeaderProps) {
  return (
    <View
      {...props}
      className={cn('justify-between items-center flex-row', className)}
    />
  );
}

interface ModalBodyProps extends React.ComponentProps<typeof ScrollView> {
  className?: string;
}

function ModalBody({ className, ...props }: ModalBodyProps) {
  return (
    <ScrollView
      {...props}
      scrollEnabled={false}
      nestedScrollEnabled
      showsVerticalScrollIndicator={false}
      className={cn('mt-2 mb-6', className)}
    />
  );
}

interface ModalFooterProps extends React.ComponentProps<typeof View> {
  className?: string;
}

function ModalFooter({ className, ...props }: ModalFooterProps) {
  return (
    <View
      {...props}
      className={cn('flex-row justify-end items-center gap-2', className)}
    />
  );
}

interface ModalCloseButtonProps extends React.ComponentProps<typeof Pressable> {
  className?: string;
}

function ModalCloseButton({ className, onPress, ...props }: ModalCloseButtonProps) {
  const { onClose } = useContext(ModalContext);
  return (
    <Pressable
      {...props}
      onPress={onPress ?? onClose}
      className={cn(
        'z-10 rounded data-[focus-visible=true]:web:bg-background/90 web:outline-0 cursor-pointer',
        className,
      )}
    />
  );
}

export {
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
};
