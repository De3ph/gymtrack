"use client";
import React from "react";
import { createInput } from "@gluestack-ui/core/input/creator";
import { tva, withStyleContext, type VariantProps } from "@gluestack-ui/utils/nativewind-utils";
import { Pressable, TextInput, View } from "react-native";
import { StyledUIIcon } from "@/components/ui/icon";

const SCOPE = "INPUT";

const UIInput = createInput({
  Root: withStyleContext(View, SCOPE),
  Icon: StyledUIIcon,
  Slot: Pressable,
  Input: TextInput,
});

const inputStyle = tva({
  base: "min-h-10 w-full flex-row items-center gap-2 overflow-hidden rounded-md border border-border bg-transparent px-3 data-[focus=true]:border-strong data-[focus=true]:outline-none data-[invalid=true]:border-danger/40 data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50",
});

const inputIconStyle = tva({
  base: "h-4 w-4 items-center justify-center text-text-tertiary fill-none",
});

const inputSlotStyle = tva({
  base: "items-center justify-center",
});

const inputFieldStyle = tva({
  base: "h-full flex-1 py-1 text-sm text-text placeholder:text-text-tertiary web:cursor-text web:outline-none web:data-[disabled=true]:cursor-not-allowed",
});

type IInputProps = React.ComponentProps<typeof UIInput> &
  VariantProps<typeof inputStyle> & { className?: string };

const Input = React.forwardRef<React.ComponentRef<typeof UIInput>, IInputProps>(
  function Input({ className, ...props }, ref) {
    return (
      <UIInput ref={ref} {...props} className={inputStyle({ class: className })} context={{}} />
    );
  },
);

type IInputIconProps = React.ComponentProps<typeof UIInput.Icon> &
  VariantProps<typeof inputIconStyle> & {
    className?: string;
    height?: number;
    width?: number;
  };

const InputIcon = React.forwardRef<
  React.ComponentRef<typeof UIInput.Icon>,
  IInputIconProps
>(function InputIcon({ className, ...props }, ref) {
  return (
    <UIInput.Icon ref={ref} {...props} className={inputIconStyle({ class: className })} />
  );
});

type IInputSlotProps = React.ComponentProps<typeof UIInput.Slot> &
  VariantProps<typeof inputSlotStyle> & { className?: string };

const InputSlot = React.forwardRef<
  React.ComponentRef<typeof UIInput.Slot>,
  IInputSlotProps
>(function InputSlot({ className, ...props }, ref) {
  return (
    <UIInput.Slot ref={ref} {...props} className={inputSlotStyle({ class: className })} />
  );
});

type IInputFieldProps = React.ComponentProps<typeof UIInput.Input> &
  VariantProps<typeof inputFieldStyle> & { className?: string };

const InputField = React.forwardRef<
  React.ComponentRef<typeof UIInput.Input>,
  IInputFieldProps
>(function InputField({ className, ...props }, ref) {
  return (
    <UIInput.Input ref={ref} {...props} className={inputFieldStyle({ class: className })} />
  );
});

Input.displayName = "Input";
InputIcon.displayName = "InputIcon";
InputSlot.displayName = "InputSlot";
InputField.displayName = "InputField";

export { Input, InputField, InputIcon, InputSlot };
