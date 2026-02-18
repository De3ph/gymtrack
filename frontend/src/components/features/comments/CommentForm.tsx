"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateCommentFormData>({
    resolver: zodResolver(createCommentSchema),
    defaultValues: {
      targetType,
      targetId,
      content: "",
      parentCommentId: parentCommentId ?? undefined,
    },
  });

  const { mutate } = useMutation({
    mutationFn: (data: CreateCommentFormData) => commentApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      reset({ content: "", targetType, targetId, parentCommentId: undefined });
      onSuccess?.();
      onCancel?.();
    },
  });

  return (
    <form
      onSubmit={handleSubmit((data) =>
        mutate({
          targetType,
          targetId,
          content: data.content,
          parentCommentId: parentCommentId ?? undefined,
        })
      )}
      className="space-y-2"
    >
      <Textarea
        {...register("content")}
        placeholder={placeholder}
        rows={3}
        className="resize-none"
      />
      {errors.content && (
        <p className="text-sm text-destructive">{errors.content.message}</p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? "Posting..." : parentCommentId ? "Reply" : "Comment"}
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
