"use client";

import * as React from "react";
import { AnyFieldApi } from "@tanstack/react-form";
import { FieldError } from "@/components/ui/field";

interface FieldInfoProps {
  field: AnyFieldApi;
}

export function FieldInfo({ field }: FieldInfoProps) {
  const rawErrors = field.state.meta.errors ?? [];
  const errors = rawErrors
    .map((e) => (typeof e === "string" ? { message: e } : e))
    .filter((e) => e?.message);

  return (
    <FieldError errors={errors.length > 0 ? errors : undefined} />
  );
}
