"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";

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
      {/* Header — hairline panel header with mono uppercase label */}
      <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-4 text-muted-foreground" aria-hidden="true" />
          <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {t("list.title")}
          </h2>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {t("list.comments_count", { count: comments.length })}
        </span>
      </header>

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
