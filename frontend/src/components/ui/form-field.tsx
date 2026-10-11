"use client";

import * as React from "react";
import { AnyFieldApi } from "@tanstack/react-form";
import { FieldError, fieldErrorId } from "@/components/ui/field";

interface FieldInfoProps {
  field: AnyFieldApi;
  /** Overrides the id derived from `field.name`. Rarely needed. */
  id?: string;
}

/**
 * Renders a field's validation errors.
 *
 * The error always gets a stable id (see `fieldErrorId`) so the control can
 * point at it with `aria-describedby`; without that link the message is
 * announced once on appearance but is not associated with the input.
 */
export function FieldInfo({ field, id }: FieldInfoProps) {
  const rawErrors = field.state.meta.errors ?? [];
  const errors = rawErrors
    .map((e) => (typeof e === "string" ? { message: e } : e))
    .filter((e) => e?.message);

  return (
    <FieldError
      id={id ?? fieldErrorId(field.name)}
      errors={errors.length > 0 ? errors : undefined}
    />
  );
}
