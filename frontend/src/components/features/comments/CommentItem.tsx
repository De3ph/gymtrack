"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Edit2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { commentApi } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { Comment } from "@/types";
import { updateCommentSchema } from "@/lib/validations/comment";
import { formatDate } from "@/lib/i18n/dayjs";

interface CommentItemProps {
  comment: Comment;
  targetType: "workout" | "meal";
  targetId: string | number;
  isReply?: boolean;
  onReply?: (parentCommentId: string | number) => void;
  queryKey: (string | number)[];
}

export function CommentItem({
  comment,
  isReply = false,
  onReply,
  queryKey,
}: CommentItemProps) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const t = useTranslations("comment");
  const tCommon = useTranslations("common");
  const [isEditing, setIsEditing] = React.useState(false);
  const [editContent, setEditContent] = React.useState(comment.content);

  const isOwn = user?.userId === comment.authorId;

  const { mutate: updateComment, isPending: isUpdating } = useMutation({
    mutationFn: ({ id, content }: { id: string | number; content: string }) =>
      commentApi.update(id, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setIsEditing(false);
    },
  });

  const { mutate: deleteComment, isPending: isDeleting } = useMutation({
    mutationFn: (id: string | number) => commentApi.delete(id),
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
      className={`border border-border p-3 ${isReply ? "border-l-2 border-l-muted" : ""}`}
    >
      <div className="flex items-center justify-between gap-2 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
        <span className="text-foreground">{comment.authorRole}</span>
        <span>
          {formatDate(comment.createdAt, "MMM D, YYYY h:mm A")}
          {comment.editedAt && (
            <span className="ml-2">{t("item.edited_label")}</span>
          )}
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
              {tCommon("actions.save")}
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancelEdit}>
              {tCommon("actions.cancel")}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
            {comment.content}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {onReply && !isReply && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onReply(comment.commentId)}
              >
                <MessageSquare className="mr-1.5 size-3" aria-hidden="true" />
                {t("item.reply")}
              </Button>
            )}
            {isOwn && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit2 className="mr-1.5 size-3" aria-hidden="true" />
                  {t("item.edit")}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        disabled={isDeleting}
                      >
                        <Trash2 className="mr-1.5 size-3" aria-hidden="true" />
                        {t("item.delete")}
                      </Button>
                    }
                  />
                  <AlertDialogContent className="rounded-none border border-border shadow-none ring-0">
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {t("item.delete_confirm")}
                      </AlertDialogTitle>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{tCommon("actions.cancel")}</AlertDialogCancel>
                      <AlertDialogAction
                        variant="destructive"
                        onClick={() => deleteComment(comment.commentId)}
                        disabled={isDeleting}
                      >
                        {t("item.delete")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
