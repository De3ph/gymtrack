/**
 * Comment content rules, shared by the create form and the inline edit flow.
 *
 * Pure by design: no `t()`, no React. Each caller maps the returned code to a
 * translated message, so the rule and its wording can't drift apart.
 *
 * COMMENT_MAX_LENGTH mirrors the backend's `validate:"required,min=1,max=2000"`
 * on models.Comment.Content.
 */

export const COMMENT_MAX_LENGTH = 2000;

export type CommentContentFailure = "empty" | "too_long";

export function validateCommentContent(raw: string): CommentContentFailure | undefined {
  if (raw.trim().length === 0) return "empty";
  if (raw.length > COMMENT_MAX_LENGTH) return "too_long";
  return undefined;
}

/**
 * Shape of the comment form payload.
 *
 * Previously inferred from a schema nothing ever parsed: CommentForm validates
 * `content` inline so the messages can come from next-intl. The bounds live in
 * `validateCommentContent` above.
 */
export interface CreateCommentFormData {
  targetType: "workout" | "meal";
  targetId: string;
  content: string;
  parentCommentId?: string;
}