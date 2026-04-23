"use client";

import * as React from "react";
import { AnyFieldApi } from "@tanstack/react-form";
import { FieldError } from "@/components/ui/field";

interface FieldInfoProps {
  field: AnyFieldApi;
}

export function FieldInfo({ field }: FieldInfoProps) {
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <FieldError errors={isInvalid ? field.state.meta.errors : undefined} />
  );
}
