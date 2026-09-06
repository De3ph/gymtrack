"use client";
import { createButton } from "@gluestack-ui/core/button/creator";
import {
  tva,
  useStyleContext,
  withStyleContext,
  type VariantProps,
} from "@gluestack-ui/utils/nativewind-utils";
import React from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { StyledUIIcon } from "@/components/ui/icon";

const SCOPE = "BUTTON";
const Root = withStyleContext(Pressable, SCOPE);

const UIButton = createButton({
  Root,
  Text,
  Group: View,
  Spinner: ActivityIndicator,
  Icon: StyledUIIcon,
});

const buttonStyle = tva({
  base: "flex-row items-center justify-center gap-2 rounded-md data-[disabled=true]:opacity-40 data-[focus-visible=true]:web:outline-none",
  variants: {
    style: {
      "solid-primary":
        "bg-accent data-[hover=true]:bg-accent/90 data-[active=true]:bg-accent/90",
      "solid-secondary":
        "bg-surface-subtle data-[hover=true]:bg-surface-subtle/80 data-[active=true]:bg-surface-subtle/80",
      "solid-negative":
        "bg-danger data-[hover=true]:bg-danger/90 data-[active=true]:bg-danger/90",
      outline:
        "border border-border bg-transparent data-[hover=true]:bg-accent-surface data-[active=true]:bg-accent-surface",
      ghost:
        "bg-transparent data-[hover=true]:bg-accent-surface data-[active=true]:bg-accent-surface",
      link: "bg-transparent px-0",
    },
    size: { sm: "min-h-8 px-3", md: "min-h-10 px-4", lg: "min-h-12 px-6" },
  },
});

const buttonTextStyle = tva({
  base: "text-center web:select-none",
  parentVariants: {
    style: {
      "solid-primary": "text-on-accent",
      "solid-secondary": "text-text",
      "solid-negative": "text-danger-on-fill",
      outline: "text-text",
      ghost: "text-text",
      link: "text-accent underline",
    },
    size: { sm: "text-xs", md: "text-sm", lg: "text-base" },
  },
});

const buttonSpinnerStyle = tva({
  base: "",
  parentVariants: {
    size: { sm: "h-3 w-3", md: "h-4 w-4", lg: "h-5 w-5" },
  },
});

const buttonIconStyle = tva({
  base: "fill-none shrink-0 pointer-events-none",
  parentVariants: {
    style: {
      "solid-primary": "text-on-accent",
      "solid-secondary": "text-text",
      "solid-negative": "text-danger-on-fill",
      outline: "text-text",
      ghost: "text-text",
      link: "text-accent",
    },
    size: { sm: "h-3 w-3", md: "h-4 w-4", lg: "h-5 w-5" },
  },
});

const buttonGroupStyle = tva({
  base: "",
  variants: {
    space: { xs: "gap-1", sm: "gap-2", md: "gap-3", lg: "gap-4", xl: "gap-5" },
    isAttached: { true: "gap-0" },
    flexDirection: {
      row: "flex-row",
      column: "flex-col",
      "row-reverse": "flex-row-reverse",
      "column-reverse": "flex-col-reverse",
    },
  },
});

type ButtonAction = "primary" | "secondary" | "negative";
type ButtonVariant = "solid" | "outline" | "ghost" | "link";
type ButtonStyleKey =
  | "solid-primary"
  | "solid-secondary"
  | "solid-negative"
  | "outline"
  | "ghost"
  | "link";

type IButtonProps = Omit<React.ComponentPropsWithoutRef<typeof UIButton>, "context"> &
  Omit<VariantProps<typeof buttonStyle>, "style"> & {
    action?: ButtonAction;
    variant?: ButtonVariant;
    className?: string;
  };

const Button = React.forwardRef<React.ComponentRef<typeof UIButton>, IButtonProps>(
  (
    { className, action = "primary", variant = "solid", size = "md", ...props },
    ref,
  ) => {
    const style: ButtonStyleKey =
      variant === "solid" ? `solid-${action}` : (variant as ButtonStyleKey);
    return (
      <UIButton
        ref={ref}
        {...props}
        className={buttonStyle({ style, size, class: className })}
        context={{ style, size }}
      />
    );
  },
);

type IButtonTextProps = React.ComponentPropsWithoutRef<typeof UIButton.Text> &
  VariantProps<typeof buttonTextStyle> & { className?: string };

const ButtonText = React.forwardRef<
  React.ComponentRef<typeof UIButton.Text>,
  IButtonTextProps
>(({ className, size, ...props }, ref) => {
  const { style: parentStyle, size: parentSize } = useStyleContext(SCOPE);
  return (
    <UIButton.Text
      ref={ref}
      {...props}
      className={buttonTextStyle({
        parentVariants: { style: parentStyle, size: parentSize },
        size,
        class: className,
      })}
    />
  );
});

const ButtonSpinner = React.forwardRef<
  React.ComponentRef<typeof UIButton.Spinner>,
  React.ComponentPropsWithoutRef<typeof UIButton.Spinner> & { className?: string }
>(({ className, ...props }, ref) => {
  const { size: parentSize } = useStyleContext(SCOPE);
  return (
    <UIButton.Spinner
      ref={ref}
      {...props}
      className={buttonSpinnerStyle({ parentVariants: { size: parentSize }, class: className })}
    />
  );
});

type IButtonIcon = React.ComponentPropsWithoutRef<typeof UIButton.Icon> &
  VariantProps<typeof buttonIconStyle> & {
    className?: string;
    as?: React.ElementType;
    height?: number;
    width?: number;
  };

const ButtonIcon = React.forwardRef<React.ComponentRef<typeof UIButton.Icon>, IButtonIcon>(
  ({ className, size, ...props }, ref) => {
    const { style: parentStyle, size: parentSize } = useStyleContext(SCOPE);
    if (typeof size === "number") {
      return (
        <UIButton.Icon
          ref={ref}
          {...props}
          className={buttonIconStyle({ class: className })}
          size={size}
        />
      );
    }
    if ((props.height !== undefined || props.width !== undefined) && size === undefined) {
      return (
        <UIButton.Icon
          ref={ref}
          {...props}
          className={buttonIconStyle({ class: className })}
        />
      );
    }
    return (
      <UIButton.Icon
        {...props}
        className={buttonIconStyle({
          parentVariants: { style: parentStyle, size: parentSize },
          size,
          class: className,
        })}
        ref={ref}
      />
    );
  },
);

type IButtonGroupProps = React.ComponentPropsWithoutRef<typeof UIButton.Group> &
  VariantProps<typeof buttonGroupStyle> & { className?: string };

const ButtonGroup = React.forwardRef<
  React.ComponentRef<typeof UIButton.Group>,
  IButtonGroupProps
>(
  (
    { className, space = "md", isAttached = false, flexDirection = "column", ...props },
    ref,
  ) => {
    return (
      <UIButton.Group
        className={buttonGroupStyle({ class: className, space, isAttached, flexDirection })}
        {...props}
        ref={ref}
      />
    );
  },
);

Button.displayName = "Button";
ButtonText.displayName = "ButtonText";
ButtonSpinner.displayName = "ButtonSpinner";
ButtonIcon.displayName = "ButtonIcon";
ButtonGroup.displayName = "ButtonGroup";

export { Button, ButtonGroup, ButtonIcon, ButtonSpinner, ButtonText };
