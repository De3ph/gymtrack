import { z } from "zod";

export const commentTargetTypeSchema = z.enum(["workout", "meal"]);

export const createCommentSchema = z.object({
  targetType: commentTargetTypeSchema,
  targetId: z.string().min(1, "Target ID is required"),
  content: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(2000, "Comment must be at most 2000 characters"),
  parentCommentId: z.string().optional().nullable(),
});

export const updateCommentSchema = z.object({
  content: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(2000, "Comment must be at most 2000 characters"),
});

export type CreateCommentFormData = z.infer<typeof createCommentSchema>;
export type UpdateCommentFormData = z.infer<typeof updateCommentSchema>;
