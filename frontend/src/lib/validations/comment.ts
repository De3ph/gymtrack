import { z } from "zod";

const commentTargetTypeSchema = z.enum(["workout", "meal"]);

const createCommentSchema = z.object({
  targetType: commentTargetTypeSchema,
  targetId: z.number().int().positive("Target ID is required"),
  content: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(2000, "Comment must be at most 2000 characters"),
  parentCommentId: z.number().int().optional().nullable(),
});

export const updateCommentSchema = z.object({
  content: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(2000, "Comment must be at most 2000 characters"),
});

export type CreateCommentFormData = z.infer<typeof createCommentSchema>;
