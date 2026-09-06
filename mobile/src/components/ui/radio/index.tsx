"use client";
import { createRadio } from "@gluestack-ui/core/radio/creator";
import { tva, useStyleContext, withStyleContext, type VariantProps } from "@gluestack-ui/utils/nativewind-utils";
import React from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { StyledUIIcon } from "@/components/ui/icon";

const SCOPE = "Radio";

const UIRadio = createRadio({
  Root: (Platform.OS === "web"
    ? withStyleContext(View, SCOPE)
    : withStyleContext(Pressable, SCOPE)) as ReturnType<
      typeof withStyleContext<typeof Pressable>
    >,
  Group: View,
  Icon: StyledUIIcon,
  Indicator: View,
  Label: Text,
});

const radioStyle = tva({
  base: "group/radio flex-row items-center justify-start gap-2 web:cursor-pointer data-[disabled=true]:web:cursor-not-allowed data-[disabled=true]:opacity-50",
  variants: {
    size: { sm: "gap-1.5", md: "gap-2", lg: "gap-2" },
  },
});

const radioGroupStyle = tva({
  base: "gap-3",
});

const radioIconStyle = tva({
  base: "absolute h-2 w-2 rounded-full stroke-none fill-accent",
  parentVariants: {
    size: { sm: "h-[9px] w-[9px]", md: "h-3 w-3", lg: "h-4 w-4" },
  },
});

const radioIndicatorStyle = tva({
  base: "relative aspect-square h-4 w-4 shrink-0 items-center justify-center rounded-full border border-border data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-50",
  parentVariants: {
    size: { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-6 w-6" },
  },
});

const radioLabelStyle = tva({
  base: "text-sm font-medium text-text web:cursor-pointer web:select-none data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-50",
  parentVariants: {
    size: { sm: "text-xs", md: "text-base", lg: "text-lg" },
  },
});

type IRadioProps = Omit<React.ComponentProps<typeof UIRadio>, "context"> &
  VariantProps<typeof radioStyle> & { className?: string };

const Radio = React.forwardRef<React.ComponentRef<typeof UIRadio>, IRadioProps>(
  function Radio({ className, size = "md", ...props }, ref) {
    return (
      <UIRadio
        className={radioStyle({ class: className, size })}
        {...props}
        ref={ref}
        context={{ size }}
      />
    );
  },
);

type IRadioGroupProps = React.ComponentProps<typeof UIRadio.Group> &
  VariantProps<typeof radioGroupStyle> & { className?: string };

const RadioGroup = React.forwardRef<
  React.ComponentRef<typeof UIRadio.Group>,
  IRadioGroupProps
>(function RadioGroup({ className, ...props }, ref) {
  return (
    <UIRadio.Group
      className={radioGroupStyle({ class: className })}
      {...props}
      ref={ref}
    />
  );
});

type IRadioIndicatorProps = React.ComponentProps<typeof UIRadio.Indicator> &
  VariantProps<typeof radioIndicatorStyle> & { className?: string };

const RadioIndicator = React.forwardRef<
  React.ComponentRef<typeof UIRadio.Indicator>,
  IRadioIndicatorProps
>(function RadioIndicator({ className, ...props }, ref) {
  const { size } = useStyleContext(SCOPE);
  return (
    <UIRadio.Indicator
      className={radioIndicatorStyle({
        parentVariants: { size },
        class: className,
      })}
      ref={ref}
      {...props}
    />
  );
});

type IRadioLabelProps = React.ComponentProps<typeof UIRadio.Label> &
  VariantProps<typeof radioLabelStyle> & { className?: string };

const RadioLabel = React.forwardRef<
  React.ComponentRef<typeof UIRadio.Label>,
  IRadioLabelProps
>(function RadioLabel({ className, ...props }, ref) {
  const { size } = useStyleContext(SCOPE);
  return (
    <UIRadio.Label
      className={radioLabelStyle({
        parentVariants: { size },
        class: className,
      })}
      ref={ref}
      {...props}
    />
  );
});

type IRadioIconProps = React.ComponentProps<typeof UIRadio.Icon> &
  VariantProps<typeof radioIconStyle> & {
    className?: string;
    height?: number;
    width?: number;
  };

const RadioIcon = React.forwardRef<
  React.ComponentRef<typeof UIRadio.Icon>,
  IRadioIconProps
>(function RadioIcon({ className, size, ...props }, ref) {
  const { size: parentSize } = useStyleContext(SCOPE);

  if (typeof size === "number") {
    return (
      <UIRadio.Icon
        ref={ref}
        {...props}
        className={radioIconStyle({ class: className })}
        size={size}
      />
    );
  }
  if ((props.height !== undefined || props.width !== undefined) && size === undefined) {
    return (
      <UIRadio.Icon
        ref={ref}
        {...props}
        className={radioIconStyle({ class: className })}
      />
    );
  }

  return (
    <UIRadio.Icon
      {...props}
      className={radioIconStyle({
        parentVariants: { size: parentSize },
        size,
        class: className,
      })}
      ref={ref}
    />
  );
});

Radio.displayName = "Radio";
RadioGroup.displayName = "RadioGroup";
RadioIndicator.displayName = "RadioIndicator";
RadioLabel.displayName = "RadioLabel";
RadioIcon.displayName = "RadioIcon";

export { Radio, RadioGroup, RadioIcon, RadioIndicator, RadioLabel };
