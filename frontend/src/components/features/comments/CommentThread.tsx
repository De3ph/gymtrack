"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";

import { Spinner } from "@/components/ui/spinner";
import { Separator } from "@/components/ui/separator";
import { commentApi } from "@/lib/api";
import { CommentList } from "./CommentList";
import { CommentForm } from "./CommentForm";

interface CommentThreadProps {
  targetType: "workout" | "meal";
  targetId: string | number;
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
  const t = useTranslations("comment");
  const [replyingToId, setReplyingToId] = React.useState<string | number | null>(null);

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

  return (
    <section className="border border-border" aria-label={t("list.title")}>
      {/* `comments_count` is defined in messages/{en,tr}.json but was never
          rendered, so the thread gave no indication of its size. */}
      {comments.length > 0 && (
        <h3 className="border-b border-border px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:px-6">
          {t("list.comments_count", { count: comments.length })}
        </h3>
      )}
      {/* Body */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      ) : error ? (
        <div className="px-4 py-6 sm:px-6">
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : t("list.load_failed")}
          </p>
        </div>
      ) : (
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
      )}

      {/* Form — separated by a hairline, not floating */}
      {!readOnly && !isLoading && !error && (
        <>
          <Separator />
          <div className="px-4 py-4 sm:px-6 sm:py-6">
            <CommentForm
              targetType={targetType}
              targetId={targetId}
              queryKey={queryKey}
              onSuccess={onCommentAdded}
            />
          </div>
        </>
      )}
    </section>
  );
}
