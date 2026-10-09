'use client';
import React from 'react';
import { createFab } from '@gluestack-ui/core/fab/creator';
import { Pressable as RNPressable, Text as RNText } from 'react-native';
import { tva, withStyleContext } from '@gluestack-ui/utils/nativewind-utils';
import { styled } from 'nativewind';
import { UIIcon } from '@gluestack-ui/core/icon/creator';
import type { VariantProps } from '@gluestack-ui/utils/nativewind-utils';

const SCOPE = 'FAB';

const StyledUIIcon = styled(UIIcon, { className: 'style' });

const UIFab = createFab({
  Root: withStyleContext(RNPressable, SCOPE),
  Label: RNText,
  Icon: StyledUIIcon,
});

const fabStyle = tva({
  base: 'items-center justify-center rounded-full shadow-hard-2 data-[focus-visible=true]:outline-none data-[focus-visible=true]:ring-2 data-[focus-visible=true]:ring-ring data-[disabled=true]:opacity-40',
  variants: {
    size: {
      sm: 'h-10 w-10',
      md: 'h-14 w-14',
      lg: 'h-16 w-16',
    },
    placement: {
      'top left': 'absolute top-5 left-5',
      'top right': 'absolute top-5 right-5',
      'bottom left': 'absolute bottom-5 left-5',
      'bottom right': 'absolute bottom-5 right-5',
      'top center': 'absolute top-5 left-[50%] -translate-x-[50%]',
      'bottom center': 'absolute bottom-5 left-[50%] -translate-x-[50%]',
    },
  },
});

const fabLabelStyle = tva({
  base: 'text-sm font-medium',
});

const fabIconStyle = tva({
  base: 'fill-none pointer-events-none',
});

type IFabProps = React.ComponentProps<typeof UIFab> &
  VariantProps<typeof fabStyle> & { className?: string };

const Fab = React.forwardRef<React.ComponentRef<typeof UIFab>, IFabProps>(
  function Fab({ className, size = 'md', placement, ...props }, ref) {
    return (
      <UIFab
        ref={ref}
        {...props}
        placement={placement}
        className={fabStyle({ size, placement, class: className })}
        context={{ size, placement }}
      />
    );
  }
);

type IFabLabelProps = React.ComponentProps<typeof UIFab.Label> &
  VariantProps<typeof fabLabelStyle> & { className?: string };

const FabLabel = React.forwardRef<
  React.ComponentRef<typeof UIFab.Label>,
  IFabLabelProps
>(function FabLabel({ className, ...props }, ref) {
  return (
    <UIFab.Label
      ref={ref}
      {...props}
      className={fabLabelStyle({ class: className })}
    />
  );
});

type IFabIconProps = React.ComponentProps<typeof UIFab.Icon> &
  VariantProps<typeof fabIconStyle> & { className?: string };

const FabIcon = React.forwardRef<
  React.ComponentRef<typeof UIFab.Icon>,
  IFabIconProps
>(function FabIcon({ className, ...props }, ref) {
  return (
    <UIFab.Icon
      ref={ref}
      {...props}
      className={fabIconStyle({ class: className })}
    />
  );
});

Fab.displayName = 'Fab';
FabLabel.displayName = 'FabLabel';
FabIcon.displayName = 'FabIcon';

export { Fab, FabIcon, FabLabel };