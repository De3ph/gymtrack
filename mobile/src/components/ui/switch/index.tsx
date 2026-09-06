"use client";
import React from "react";
import { Switch as RNSwitch } from "react-native";
import { createSwitch } from "@gluestack-ui/core/switch/creator";
import { tva, withStyleContext, type VariantProps } from "@gluestack-ui/utils/nativewind-utils";

const UISwitch = createSwitch({
  Root: withStyleContext(RNSwitch),
});

const switchStyle = tva({
  base: "data-[disabled=true]:opacity-40 data-[focus=true]:outline-none",
  variants: {
    size: { sm: "scale-[0.75]", md: "", lg: "scale-[1.25]" },
  },
});

type ISwitchProps = React.ComponentProps<typeof UISwitch> &
  VariantProps<typeof switchStyle> & { className?: string };

const Switch = React.forwardRef<React.ComponentRef<typeof UISwitch>, ISwitchProps>(
  function Switch({ className, size = "md", ...props }, ref) {
    return (
      <UISwitch
        ref={ref}
        {...props}
        className={switchStyle({ size, class: className })}
      />
    );
  },
);

Switch.displayName = "Switch";
export { Switch };
