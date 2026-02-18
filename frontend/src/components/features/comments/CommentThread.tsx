"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Loader2 } from "lucide-react";

import { commentApi } from "@/lib/api";
import { CommentList } from "./CommentList";
import { CommentForm } from "./CommentForm";

interface CommentThreadProps {
  targetType: "workout" | "meal";
  targetId: string;
  readOnly?: boolean;
  onCommentAdded?: () => void;
  enabled?: boolean;
}

export function CommentThread({
  targetType,
  targetId,
  readOnly = false,
  onCommentAdded,
  enabled = true,
}: CommentThreadProps) {
  const [replyingToId, setReplyingToId] = React.useState<string | null>(null);

  const queryKey = ["comments", targetType, targetId];
  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: () => commentApi.getByTarget(targetType, targetId),
    enabled: enabled && !!targetId,
  });

  const comments = data?.comments ?? [];

  if (!enabled || !targetId) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-destructive py-2">
        {error instanceof Error ? error.message : "Failed to load comments"}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <MessageSquare className="h-4 w-4" />
        <span>Comments ({comments.length})</span>
      </div>
      <CommentList
        comments={comments}
        targetType={targetType}
        targetId={targetId}
        queryKey={queryKey}
        readOnly={readOnly}
        replyingToId={replyingToId}
        onStartReply={setReplyingToId}
        onCancelReply={() => setReplyingToId(null)}
      />
      {!readOnly && (
        <CommentForm
          targetType={targetType}
          targetId={targetId}
          queryKey={queryKey}
          onSuccess={onCommentAdded}
        />
      )}
    </div>
  );
}
