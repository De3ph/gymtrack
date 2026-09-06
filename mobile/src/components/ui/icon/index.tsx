"use client";
import React from "react";
import { createIcon } from "@gluestack-ui/core/icon/creator";
import {
  PrimitiveIcon,
  Svg,
  type IPrimitiveIcon,
} from "@gluestack-ui/core/icon/creator";
import { tva, type VariantProps } from "@gluestack-ui/utils/nativewind-utils";
import { styled } from "nativewind";

// Cast: core's raw UIIcon has a broken union ref type (@gluestack-ui/core 5.0.15).
export const UIIcon = createIcon({
  Root: PrimitiveIcon,
}) as React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof PrimitiveIcon> &
    React.RefAttributes<React.ComponentRef<typeof Svg>>
>;
const iconStyle = tva({
  base: "fill-none pointer-events-none",
  variants: {
    size: {
      "2xs": "h-3 w-3",
      xs: "h-3.5 w-3.5",
      sm: "h-4 w-4",
      md: "h-[18px] w-[18px]",
      lg: "h-5 w-5",
      xl: "h-6 w-6",
    },
  },
});

type IIConProps = IPrimitiveIcon &
  VariantProps<typeof iconStyle> &
  React.ComponentPropsWithoutRef<typeof UIIcon>;

// Cast: tsc resolves react-native-css's web declaration of `styled` (plain
// function, no ref type); the native runtime does forward refs.
export const StyledUIIcon = styled(UIIcon, { className: "style" }) as React.ForwardRefExoticComponent<
  IIConProps & React.RefAttributes<React.ComponentRef<typeof UIIcon>>
>;

const Icon = React.forwardRef<React.ComponentRef<typeof UIIcon>, IIConProps>(
  function Icon({ size = "md", className, ...props }, ref) {
    if (typeof size === "number") {
      return (
        <StyledUIIcon
          ref={ref}
          {...props}
          className={iconStyle({ class: className })}
          size={size}
        />
      );
    }
    if ((props.height !== undefined || props.width !== undefined) && size === undefined) {
      return (
        <StyledUIIcon ref={ref} {...props} className={iconStyle({ class: className })} />
      );
    }
    return (
      <StyledUIIcon
        ref={ref}
        {...props}
        className={iconStyle({ size, class: className })}
      />
    );
  },
);

export { Icon };

type ParameterTypes = Omit<Parameters<typeof createIcon>[0], "Root">;

const createIconUI = ({ ...props }: ParameterTypes) => {
  const UIIconCreateIcon = createIcon({
    Root: Svg,
    ...props,
  }) as React.ForwardRefExoticComponent<
    React.ComponentPropsWithoutRef<typeof PrimitiveIcon> &
      React.RefAttributes<React.ComponentRef<typeof Svg>>
  >;

  return React.forwardRef<React.ComponentRef<typeof Svg>, IIConProps>(
    function UIIconCreated({ className, size, ...incomingProps }, ref) {
      return (
        <UIIconCreateIcon
          ref={ref}
          {...incomingProps}
          className={iconStyle({ size, class: className })}
        />
      );
    },
  );
};
export { createIconUI as createIcon };
