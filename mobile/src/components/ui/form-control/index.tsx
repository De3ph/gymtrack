"use client";
import { createFormControl } from "@gluestack-ui/core/form-control/creator";
import { tva, withStyleContext, type VariantProps } from "@gluestack-ui/utils/nativewind-utils";
import React from "react";
import { Text, View } from "react-native";
import { StyledUIIcon } from "@/components/ui/icon";

const SCOPE = "FORM_CONTROL";

const formControlStyle = tva({
  base: "flex flex-col",
});

const formControlErrorIconStyle = tva({
  base: "h-[18px] w-[18px] text-danger fill-none",
});

const formControlErrorStyle = tva({
  base: "mt-1 flex flex-row items-center justify-start gap-1",
});

const formControlErrorTextStyle = tva({
  base: "text-xs text-danger",
  variants: {
    isTruncated: { true: "web:truncate" },
    bold: { true: "font-bold" },
    underline: { true: "underline" },
    strikeThrough: { true: "line-through" },
    sub: { true: "text-xs" },
    italic: { true: "italic" },
    highlight: { true: "bg-warning-surface" },
  },
});

const formControlHelperStyle = tva({
  base: "mt-1 flex flex-row items-center justify-start",
});

const formControlHelperTextStyle = tva({
  base: "text-sm text-text/70",
  variants: {
    isTruncated: { true: "web:truncate" },
    bold: { true: "font-bold" },
    underline: { true: "underline" },
    strikeThrough: { true: "line-through" },
    sub: { true: "text-xs" },
    italic: { true: "italic" },
    highlight: { true: "bg-warning-surface" },
  },
});

const formControlLabelStyle = tva({
  base: "mb-1 flex flex-row items-center justify-start",
});

const formControlLabelTextStyle = tva({
  base: "text-base font-medium text-text",
  variants: {
    isTruncated: { true: "web:truncate" },
    bold: { true: "font-bold" },
    underline: { true: "underline" },
    strikeThrough: { true: "line-through" },
    sub: { true: "text-xs" },
    italic: { true: "italic" },
    highlight: { true: "bg-warning-surface" },
  },
});

const formControlLabelAstrickStyle = tva({
  base: "text-base font-medium text-text",
  variants: {
    isTruncated: { true: "web:truncate" },
    bold: { true: "font-bold" },
    underline: { true: "underline" },
    strikeThrough: { true: "line-through" },
    sub: { true: "text-xs" },
    italic: { true: "italic" },
    highlight: { true: "bg-warning-surface" },
  },
});

type IFormControlLabelAstrickProps = React.ComponentPropsWithoutRef<typeof Text> &
  VariantProps<typeof formControlLabelAstrickStyle> & { className?: string };

const FormControlLabelAstrick = React.forwardRef<
  React.ComponentRef<typeof Text>,
  IFormControlLabelAstrickProps
>(function FormControlLabelAstrick({ className, ...props }, ref) {
  return (
    <Text
      ref={ref}
      className={formControlLabelAstrickStyle({ class: className })}
      {...props}
    />
  );
});

export const UIFormControl = createFormControl({
  Root: withStyleContext(View, SCOPE),
  Error: View,
  ErrorText: Text,
  ErrorIcon: StyledUIIcon,
  Label: View,
  LabelText: Text,
  LabelAstrick: FormControlLabelAstrick,
  Helper: View,
  HelperText: Text,
});

type IFormControlProps = React.ComponentProps<typeof UIFormControl> &
  VariantProps<typeof formControlStyle> & { className?: string };

const FormControl = React.forwardRef<
  React.ComponentRef<typeof UIFormControl>,
  IFormControlProps
>(function FormControl({ className, ...props }, ref) {
  return (
    <UIFormControl ref={ref} className={formControlStyle({ class: className })} {...props} />
  );
});

type IFormControlErrorProps = React.ComponentProps<typeof UIFormControl.Error> &
  VariantProps<typeof formControlErrorStyle> & { className?: string };

const FormControlError = React.forwardRef<
  React.ComponentRef<typeof UIFormControl.Error>,
  IFormControlErrorProps
>(function FormControlError({ className, ...props }, ref) {
  return (
    <UIFormControl.Error
      ref={ref}
      className={formControlErrorStyle({ class: className })}
      {...props}
    />
  );
});

type IFormControlErrorTextProps = React.ComponentProps<typeof UIFormControl.Error.Text> &
  VariantProps<typeof formControlErrorTextStyle> & { className?: string };

const FormControlErrorText = React.forwardRef<
  React.ComponentRef<typeof UIFormControl.Error.Text>,
  IFormControlErrorTextProps
>(function FormControlErrorText({ className, ...props }, ref) {
  return (
    <UIFormControl.Error.Text
      className={formControlErrorTextStyle({ class: className })}
      ref={ref}
      {...props}
    />
  );
});

type IFormControlErrorIconProps = React.ComponentProps<typeof UIFormControl.Error.Icon> &
  VariantProps<typeof formControlErrorIconStyle> & { className?: string };

const FormControlErrorIcon = React.forwardRef<
  React.ComponentRef<typeof UIFormControl.Error.Icon>,
  IFormControlErrorIconProps
>(function FormControlErrorIcon({ className, ...props }, ref) {
  return (
    <UIFormControl.Error.Icon
      ref={ref}
      {...props}
      className={formControlErrorIconStyle({ class: className })}
    />
  );
});

type IFormControlLabelProps = React.ComponentProps<typeof UIFormControl.Label> &
  VariantProps<typeof formControlLabelStyle> & {
    className?: string;
    htmlFor?: string;
    role?: string;
  };

const FormControlLabel = React.forwardRef<
  React.ComponentRef<typeof UIFormControl.Label>,
  IFormControlLabelProps
>(function FormControlLabel({ className, ...props }, ref) {
  return (
    <UIFormControl.Label
      ref={ref}
      className={formControlLabelStyle({ class: className })}
      {...props}
    />
  );
});

type IFormControlLabelTextProps = React.ComponentProps<typeof UIFormControl.Label.Text> &
  VariantProps<typeof formControlLabelTextStyle> & { className?: string };

const FormControlLabelText = React.forwardRef<
  React.ComponentRef<typeof UIFormControl.Label.Text>,
  IFormControlLabelTextProps
>(function FormControlLabelText({ className, ...props }, ref) {
  return (
    <UIFormControl.Label.Text
      className={formControlLabelTextStyle({ class: className })}
      ref={ref}
      {...props}
    />
  );
});

type IFormControlHelperProps = React.ComponentProps<typeof UIFormControl.Helper> &
  VariantProps<typeof formControlHelperStyle> & { className?: string };

const FormControlHelper = React.forwardRef<
  React.ComponentRef<typeof UIFormControl.Helper>,
  IFormControlHelperProps
>(function FormControlHelper({ className, ...props }, ref) {
  return (
    <UIFormControl.Helper
      ref={ref}
      className={formControlHelperStyle({ class: className })}
      {...props}
    />
  );
});

type IFormControlHelperTextProps = React.ComponentProps<typeof UIFormControl.Helper.Text> &
  VariantProps<typeof formControlHelperTextStyle> & { className?: string };

const FormControlHelperText = React.forwardRef<
  React.ComponentRef<typeof UIFormControl.Helper.Text>,
  IFormControlHelperTextProps
>(function FormControlHelperText({ className, ...props }, ref) {
  return (
    <UIFormControl.Helper.Text
      className={formControlHelperTextStyle({ class: className })}
      ref={ref}
      {...props}
    />
  );
});

FormControl.displayName = "FormControl";
FormControlError.displayName = "FormControlError";
FormControlErrorText.displayName = "FormControlErrorText";
FormControlErrorIcon.displayName = "FormControlErrorIcon";
FormControlLabel.displayName = "FormControlLabel";
FormControlLabelText.displayName = "FormControlLabelText";
FormControlLabelAstrick.displayName = "FormControlLabelAstrick";
FormControlHelper.displayName = "FormControlHelper";
FormControlHelperText.displayName = "FormControlHelperText";

export {
  FormControl,
  FormControlError,
  FormControlErrorText,
  FormControlErrorIcon,
  FormControlLabel,
  FormControlLabelText,
  FormControlLabelAstrick,
  FormControlHelper,
  FormControlHelperText,
};
