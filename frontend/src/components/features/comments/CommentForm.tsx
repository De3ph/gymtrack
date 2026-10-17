"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, fieldErrorId } from "@/components/ui/field";
import { FieldInfo } from "@/components/ui/form-field";
import { commentApi } from "@/lib/api";
import type { CreateCommentRequest } from "@/types";
import {
  COMMENT_MAX_LENGTH,
  type CreateCommentFormData,
  validateCommentContent,
} from "@/lib/validations/comment";

interface CommentFormProps {
  targetType: "workout" | "meal";
  targetId: string | number;
  parentCommentId?: string | number;
  onSuccess?: () => void;
  queryKey: readonly (string | number)[];
  placeholder?: string;
  onCancel?: () => void;
}

export function CommentForm({
  targetType,
  targetId,
  parentCommentId,
  onSuccess,
  queryKey,
  placeholder: placeholderProp,
  onCancel,
}: CommentFormProps) {
  const queryClient = useQueryClient();
  const t = useTranslations("comment");
  const placeholder = placeholderProp ?? t("form.comment");

  const validateContent = ({ value }: { value: string }): string | undefined => {
    // Shared with the inline edit flow so both enforce the backend's limit.
    const failure = validateCommentContent(value);
    if (failure === "empty") return t("form.content_required");
    if (failure === "too_long") {
      return t("form.content_too_long", { max: COMMENT_MAX_LENGTH });
    }
    return undefined;
  };

  const form = useForm({
    defaultValues: {
      content: "",
    } satisfies Pick<CreateCommentFormData, "content">,
    onSubmit: async ({ value }) => {
      mutate({
        targetType,
        targetId: String(targetId),
        content: value.content,
        parentCommentId: parentCommentId != null ? String(parentCommentId) : undefined,
      });
    },
  });

  const { mutate, isPending, error } = useMutation({
    // The payload is built in onSubmit above, not taken from the form values —
    // it always carries a normalized `parentCommentId: string | undefined`
    // rather than the schema's wider `string | null | undefined`.
    mutationFn: (data: CreateCommentRequest) => commentApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      form.reset();
      onSuccess?.();
      onCancel?.();
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className="space-y-3"
    >
      <form.Field
        name="content"
        validators={{
          onChange: validateContent,
        }}
      >
        {(field) => (
          <Field>
            <FieldLabel htmlFor="comment-content">{placeholder}</FieldLabel>
            <Textarea
              id="comment-content"
              data-testid="comment-content"
              placeholder={placeholder}
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              rows={3}
              className="resize-none"
              aria-invalid={field.state.meta.errors.length > 0 || undefined}
              aria-describedby={fieldErrorId(field.name)}
            />
            <FieldInfo field={field} />
          </Field>
        )}
      </form.Field>

      {error && (
        <div
          role="alert"
          className="rounded-none border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error instanceof Error ? error.message : t("form.post_failed")}
        </div>
      )}

      <form.Subscribe
        selector={(state) => [state.canSubmit, state.isSubmitting]}
      >
        {([canSubmit, isSubmitting]) => (
          <div className="flex items-center gap-2">
            <Button
              type="submit"
              size="sm"
              disabled={!canSubmit || isPending || isSubmitting}
            >
              {isPending || isSubmitting
                ? t("form.submitting")
                : parentCommentId
                  ? t("form.reply")
                  : t("form.comment")}
            </Button>
            {onCancel && (
              <Button type="button" size="sm" variant="outline" onClick={onCancel}>
                {t("form.cancel")}
              </Button>
            )}
          </div>
        )}
      </form.Subscribe>
    </form>
  );
}
