"use client";
import React from "react";
import { createTextarea } from "@gluestack-ui/core/textarea/creator";
import { tva, useStyleContext, withStyleContext, type VariantProps } from "@gluestack-ui/utils/nativewind-utils";
import { TextInput, View } from "react-native";

const SCOPE = "TEXTAREA";

const UITextarea = createTextarea({
  Root: withStyleContext(View, SCOPE),
  Input: TextInput,
});

const textareaStyle = tva({
  base: "h-[100px] w-full rounded border border-border data-[hover=true]:border-border/80 data-[focus=true]:border-accent/80 data-[disabled=true]:opacity-40",
  variants: {
    size: { sm: "", md: "", lg: "", xl: "" },
  },
});

const textareaInputStyle = tva({
  base: "flex-1 p-2 text-text placeholder:text-text/60 web:cursor-text web:outline-none web:data-[disabled=true]:cursor-not-allowed",
  parentVariants: {
    size: { sm: "text-sm", md: "text-base", lg: "text-lg", xl: "text-xl" },
  },
});

type ITextareaProps = React.ComponentProps<typeof UITextarea> &
  VariantProps<typeof textareaStyle> & { className?: string };

const Textarea = React.forwardRef<React.ComponentRef<typeof UITextarea>, ITextareaProps>(
  function Textarea({ className, size = "md", ...props }, ref) {
    return (
      <UITextarea
        ref={ref}
        {...props}
        className={textareaStyle({ size, class: className })}
        context={{ size }}
      />
    );
  },
);

type ITextareaInputProps = React.ComponentProps<typeof UITextarea.Input> &
  VariantProps<typeof textareaInputStyle> & { className?: string };

const TextareaInput = React.forwardRef<
  React.ComponentRef<typeof UITextarea.Input>,
  ITextareaInputProps
>(function TextareaInput({ className, ...props }, ref) {
  const { size: parentSize } = useStyleContext(SCOPE);
  return (
    <UITextarea.Input
      ref={ref}
      {...props}
      textAlignVertical="top"
      className={textareaInputStyle({
        parentVariants: { size: parentSize },
        class: className,
      })}
    />
  );
});

Textarea.displayName = "Textarea";
TextareaInput.displayName = "TextareaInput";

export { Textarea, TextareaInput };
