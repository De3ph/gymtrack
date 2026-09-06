"use client";
import { createCheckbox } from "@gluestack-ui/core/checkbox/creator";
import { tva, withStyleContext, type VariantProps } from "@gluestack-ui/utils/nativewind-utils";
import React from "react";
import type { TextProps, ViewProps } from "react-native";
import { Platform, Pressable, Text, View } from "react-native";
import { StyledUIIcon } from "@/components/ui/icon";

const IndicatorWrapper = React.forwardRef<React.ComponentRef<typeof View>, ViewProps>(
  function IndicatorWrapper({ ...props }, ref) {
    return <View {...props} ref={ref} />;
  },
);

const LabelWrapper = React.forwardRef<React.ComponentRef<typeof Text>, TextProps>(
  function LabelWrapper({ ...props }, ref) {
    return <Text {...props} ref={ref} />;
  },
);

const IconWrapper = React.forwardRef<
  React.ComponentRef<typeof StyledUIIcon>,
  React.ComponentPropsWithoutRef<typeof StyledUIIcon> & { size?: string | number }
>(function IconWrapper({ ...props }, ref) {
  return <StyledUIIcon {...props} ref={ref} />;
});

const SCOPE = "CHECKBOX";

const UICheckbox = createCheckbox({
  // @ts-expect-error : internal implementation for r-19/react-native-web
  Root:
    Platform.OS === "web"
      ? withStyleContext(View, SCOPE)
      : withStyleContext(Pressable, SCOPE),
  Group: View,
  Icon: IconWrapper,
  Label: LabelWrapper,
  Indicator: IndicatorWrapper,
});

const checkboxStyle = tva({
  base: "group/checkbox flex-row items-center justify-start gap-2 web:cursor-pointer data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-50",
});

const checkboxIndicatorStyle = tva({
  base: "h-4 w-4 shrink-0 items-center justify-center rounded border border-border data-[checked=true]:border-accent data-[checked=true]:bg-accent data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-50",
});

const checkboxLabelStyle = tva({
  base: "text-sm font-medium text-text web:cursor-pointer web:select-none data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-50",
});

const checkboxIconStyle = tva({
  base: "h-3.5 w-3.5 fill-none text-on-accent",
});

const CheckboxGroup = UICheckbox.Group;

type ICheckboxProps = Omit<React.ComponentPropsWithoutRef<typeof UICheckbox>, "context"> &
  VariantProps<typeof checkboxStyle> & { className?: string };

const Checkbox = React.forwardRef<React.ComponentRef<typeof UICheckbox>, ICheckboxProps>(
  function Checkbox({ className, ...props }, ref) {
    return (
      <UICheckbox
        className={checkboxStyle({ class: className })}
        {...props}
        context={{}}
        ref={ref}
      />
    );
  },
);

type ICheckboxIndicatorProps = React.ComponentPropsWithoutRef<typeof UICheckbox.Indicator> &
  VariantProps<typeof checkboxIndicatorStyle> & { className?: string };

const CheckboxIndicator = React.forwardRef<
  React.ComponentRef<typeof UICheckbox.Indicator>,
  ICheckboxIndicatorProps
>(function CheckboxIndicator({ className, ...props }, ref) {
  return (
    <UICheckbox.Indicator
      className={checkboxIndicatorStyle({ class: className })}
      {...props}
      ref={ref}
    />
  );
});

type ICheckboxLabelProps = React.ComponentPropsWithoutRef<typeof UICheckbox.Label> &
  VariantProps<typeof checkboxLabelStyle> & { className?: string };

const CheckboxLabel = React.forwardRef<
  React.ComponentRef<typeof UICheckbox.Label>,
  ICheckboxLabelProps
>(function CheckboxLabel({ className, ...props }, ref) {
  return (
    <UICheckbox.Label
      className={checkboxLabelStyle({ class: className })}
      {...props}
      ref={ref}
    />
  );
});

type ICheckboxIconProps = React.ComponentPropsWithoutRef<typeof UICheckbox.Icon> &
  VariantProps<typeof checkboxIconStyle> & {
    className?: string;
    height?: number;
    width?: number;
  };

const CheckboxIcon = React.forwardRef<
  React.ComponentRef<typeof UICheckbox.Icon>,
  ICheckboxIconProps
>(function CheckboxIcon({ className, size, ...props }, ref) {
  if (typeof size === "number") {
    return (
      <UICheckbox.Icon
        ref={ref}
        {...props}
        className={checkboxIconStyle({ class: className })}
        size={size}
      />
    );
  }
  if ((props.height !== undefined || props.width !== undefined) && size === undefined) {
    return (
      <UICheckbox.Icon
        ref={ref}
        {...props}
        className={checkboxIconStyle({ class: className })}
      />
    );
  }
  return (
    <UICheckbox.Icon
      className={checkboxIconStyle({ class: className })}
      {...props}
      ref={ref}
    />
  );
});

Checkbox.displayName = "Checkbox";
CheckboxIndicator.displayName = "CheckboxIndicator";
CheckboxLabel.displayName = "CheckboxLabel";
CheckboxIcon.displayName = "CheckboxIcon";

export { Checkbox, CheckboxGroup, CheckboxIcon, CheckboxIndicator, CheckboxLabel };
