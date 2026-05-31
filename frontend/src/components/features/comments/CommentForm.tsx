"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel } from "@/components/ui/field";
import { FieldInfo } from "@/components/ui/form-field";
import { commentApi } from "@/lib/api";
import {
  type CreateCommentFormData,
} from "@/lib/validations/comment";

interface CommentFormProps {
  targetType: "workout" | "meal";
  targetId: string;
  parentCommentId?: string | null;
  onSuccess?: () => void;
  queryKey: (string | number)[];
  placeholder?: string;
  onCancel?: () => void;
}

export function CommentForm({
  targetType,
  targetId,
  parentCommentId = null,
  onSuccess,
  queryKey,
  placeholder: placeholderProp,
  onCancel,
}: CommentFormProps) {
  const queryClient = useQueryClient();
  const t = useTranslations("comment");
  const placeholder = placeholderProp ?? t("form.comment");

  const validateContent = ({ value }: { value: string }): string | undefined => {
    if (!value || value.trim().length === 0) {
      return t('form.content_required')
    }
    if (value.length > 1000) {
      return t('form.content_too_long')
    }
    return undefined
  };

  const form = useForm({
    defaultValues: {
      content: "",
    } satisfies Pick<CreateCommentFormData, "content">,
    onSubmit: async ({ value }) => {
      mutate({
        targetType,
        targetId,
        content: value.content,
        parentCommentId: parentCommentId ?? undefined,
      });
    },
  });

  const { mutate, isPending, error } = useMutation({
    mutationFn: (data: CreateCommentFormData) => commentApi.create(data),
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
      className="space-y-2"
    >
      <form.Field
        name="content"
        validators={{
          onChange: validateContent,
        }}
      >
        {(field) => (
          <Field>
            <FieldLabel>{placeholder}</FieldLabel>
            <Textarea
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              rows={3}
              className="resize-none"
            />
            <FieldInfo field={field} />
          </Field>
        )}
      </form.Field>

      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          {error instanceof Error ? error.message : t('form.post_failed')}
        </div>
      )}

      <form.Subscribe
        selector={(state) => [state.canSubmit, state.isSubmitting]}
      >
        {([canSubmit, isSubmitting]) => (
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={!canSubmit || isPending || isSubmitting}>
              {isPending || isSubmitting ? t("form.submitting") : parentCommentId ? t("form.reply") : t("form.comment")}
            </Button>
            {onCancel && (
              <Button type="button" size="sm" variant="outline" onClick={onCancel}>
                {t('form.cancel')}
              </Button>
            )}
          </div>
        )}
      </form.Subscribe>
    </form>
  );
}
