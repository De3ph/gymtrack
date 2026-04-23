"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel } from "@/components/ui/field";
import { FieldInfo } from "@/components/ui/form-field";
import { commentApi } from "@/lib/api";
import {
  createCommentSchema,
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
  placeholder = "Add a comment...",
  onCancel,
}: CommentFormProps) {
  const queryClient = useQueryClient();

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

  const { mutate, isPending } = useMutation({
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
          onChange: ({ value }) => {
            if (!value || value.trim().length === 0) {
              return "Content is required"
            }
            if (value.length > 1000) {
              return "Content must be less than 1000 characters"
            }
            return undefined
          },
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
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Posting..." : parentCommentId ? "Reply" : "Comment"}
        </Button>
        {onCancel && (
          <Button type="button" size="sm" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
