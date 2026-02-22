"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { MessageSquare, Edit2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { commentApi } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { Comment } from "@/types";
import { updateCommentSchema } from "@/lib/validations/comment";

interface CommentItemProps {
  comment: Comment;
  targetType: "workout" | "meal";
  targetId: string;
  isReply?: boolean;
  onReply?: (parentCommentId: string) => void;
  queryKey: (string | number)[];
}

export function CommentItem({
  comment,
  targetType,
  targetId,
  isReply = false,
  onReply,
  queryKey,
}: CommentItemProps) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = React.useState(false);
  const [editContent, setEditContent] = React.useState(comment.content);

  const isOwn = user?.userId === comment.authorId;

  const { mutate: updateComment, isPending: isUpdating } = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      commentApi.update(id, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setIsEditing(false);
    },
  });

  const { mutate: deleteComment, isPending: isDeleting } = useMutation({
    mutationFn: (id: string) => commentApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const handleSaveEdit = () => {
    const result = updateCommentSchema.safeParse({ content: editContent });
    if (!result.success) return;
    updateComment({ id: comment.commentId, content: editContent });
  };

  const handleCancelEdit = () => {
    setEditContent(comment.content);
    setIsEditing(false);
  };

  return (
    <div
      className={`rounded-md border bg-muted/30 p-3 ${isReply ? "ml-6 border-l-2 border-l-primary/30" : ""}`}
    >
      <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
        <span className="font-medium capitalize">{comment.authorRole}</span>
        <span>
          {dayjs(comment.createdAt).format("MMM D, YYYY h:mm A")}
          {comment.editedAt && <span className="ml-1 text-xs">(edited)</span>}
        </span>
      </div>
      {isEditing ? (
        <div className="mt-2 space-y-2">
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={3}
            className="resize-none"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSaveEdit}
              disabled={isUpdating || editContent.trim().length === 0}
            >
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancelEdit}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-1 whitespace-pre-wrap text-sm">{comment.content}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {onReply && !isReply && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => onReply(comment.commentId)}
              >
                <MessageSquare className="mr-1 h-3 w-3" />
                Reply
              </Button>
            )}
            {isOwn && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit2 className="mr-1 h-3 w-3" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-destructive hover:text-destructive"
                  onClick={() => {
                    if (confirm("Delete this comment?")) {
                      deleteComment(comment.commentId);
                    }
                  }}
                  disabled={isDeleting}
                >
                  <Trash2 className="mr-1 h-3 w-3" />
                  Delete
                </Button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
