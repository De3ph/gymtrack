"use client";

import { useMemo, useCallback, memo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { Comment } from "@/types";
import dayjs from "dayjs";
import { CommentItem } from "./CommentItem";
import { CommentForm } from "./CommentForm";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";

interface CommentListProps {
  comments: Comment[];
  targetType: "workout" | "meal";
  targetId: string | number;
  queryKey: readonly (string | number)[];
  readOnly?: boolean;
  replyingToId: string | number | null;
  onStartReply: (parentCommentId: string | number) => void;
  onCancelReply: () => void;
}

interface CommentNode {
  comment: Comment;
  children: CommentNode[];
}

function buildTree(comments: Comment[]): CommentNode[] {
  const byParent = new Map<number, Comment[]>();
  for (const c of comments) {
    // c.parentCommentId is optional in generated type
    const pid = c.parentCommentId;
    if (pid == null || pid === 0) continue;
    if (!byParent.has(pid)) byParent.set(pid, []);
    byParent.get(pid)!.push(c);
  }
  for (const arr of byParent.values()) {
    arr.sort((a, b) =>
      dayjs(a.createdAt).isBefore(dayjs(b.createdAt)) ? -1 : 1
    );
  }
  function node(comment: Comment): CommentNode {
    // comment.commentId is optional in generated type but required for tree building
    const cid = comment.commentId;
    const children = (cid != null ? byParent.get(cid) : []) ?? [];
    return { comment, children: children.map(node) };
  }
  const roots = comments
    .filter((c) => !c.parentCommentId || c.parentCommentId === 0)
    .sort((a, b) => (dayjs(a.createdAt).isBefore(dayjs(b.createdAt)) ? -1 : 1));
  return roots.map(node);
}

const CommentNodeRow = memo(function CommentNodeRow({
  node,
  targetType,
  targetId,
  queryKey,
  readOnly,
  replyingToId,
  onStartReply,
  onCancelReply,
  depth,
  t,
}: {
  node: CommentNode;
  targetType: "workout" | "meal";
  targetId: string | number;
  queryKey: readonly (string | number)[];
  readOnly: boolean;
  replyingToId: string | number | null;
  onStartReply: (parentCommentId: string | number) => void;
  onCancelReply: () => void;
  depth: number;
  t: ReturnType<typeof useTranslations<"comment">>;
}) {
  const isReply = depth > 0;
  const reduce = useReducedMotion();
  return (
    <div className={isReply ? "ml-6 border-l border-border pl-4" : ""}>
      <CommentItem
        comment={node.comment}
        targetType={targetType}
        targetId={targetId}
        isReply={isReply}
        queryKey={queryKey}
        onReply={readOnly ? undefined : onStartReply}
      />
      <AnimatePresence initial={false}>
        {replyingToId === node.comment.commentId && !readOnly && (
          <motion.div
            key="reply-form"
            initial={
              reduce ? { opacity: 0 } : { height: 0, opacity: 0 }
            }
            animate={reduce ? { opacity: 1 } : { height: "auto", opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={
              reduce
                ? { duration: 0.15, ease: "easeOut" }
                : { duration: 0.2, ease: [0.23, 1, 0.32, 1] }
            }
            className="overflow-hidden"
          >
            <div className="ml-6 mt-2 border-l border-border pl-4">
              <CommentForm
                targetType={targetType}
                targetId={targetId}
                parentCommentId={node.comment.commentId}
                queryKey={queryKey}
                placeholder={t("form.reply_placeholder")}
                onCancel={onCancelReply}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence initial={false}>
        {node.children.map((child) => (
          <motion.div
            key={child.comment.commentId}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              reduce
                ? { duration: 0.15, ease: "easeOut" }
                : { duration: 0.2, ease: "easeOut" }
            }
          >
            <CommentNodeRow
              node={child}
              targetType={targetType}
              targetId={targetId}
              queryKey={queryKey}
              readOnly={readOnly}
              replyingToId={replyingToId}
              onStartReply={onStartReply}
              onCancelReply={onCancelReply}
              depth={depth + 1}
              t={t}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
});

export function CommentList({
  comments,
  targetType,
  targetId,
  queryKey,
  readOnly = false,
  replyingToId,
  onStartReply,
  onCancelReply,
}: CommentListProps) {
  const t = useTranslations("comment");
  const reduce = useReducedMotion();
  const tree = useMemo(() => buildTree(comments), [comments]);

  // Stabilise callbacks so memoised CommentNodeRow children don't re-render
  const stableOnStartReply = useCallback(
    (parentCommentId: string | number) => onStartReply(parentCommentId),
    [onStartReply],
  );
  const stableOnCancelReply = useCallback(
    () => onCancelReply(),
    [onCancelReply],
  );

  if (tree.length === 0) {
    return (
      <Empty className="rounded-none border border-border p-8">
        <EmptyHeader>
          <EmptyTitle className="font-mono text-xs uppercase tracking-[0.18em]">
            {t("list.no_comments")}
          </EmptyTitle>
          <EmptyDescription>
            {t("list.empty_description")}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="divide-y divide-border">
      <AnimatePresence initial={false}>
        {tree.map((node) => (
          <motion.div
            key={node.comment.commentId}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              reduce
                ? { duration: 0.15, ease: "easeOut" }
                : { duration: 0.2, ease: "easeOut" }
            }
            className="px-4 py-4 sm:px-6"
          >
            <CommentNodeRow
              node={node}
              targetType={targetType}
              targetId={targetId}
              queryKey={queryKey}
              readOnly={readOnly}
              replyingToId={replyingToId}
              onStartReply={stableOnStartReply}
              onCancelReply={stableOnCancelReply}
              depth={0}
              t={t}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
