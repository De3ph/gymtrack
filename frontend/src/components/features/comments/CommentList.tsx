"use client";

import { useMemo } from "react";
import { Comment } from "@/types";
import dayjs from "dayjs";
import { CommentItem } from "./CommentItem";
import { CommentForm } from "./CommentForm";

interface CommentListProps {
  comments: Comment[];
  targetType: "workout" | "meal";
  targetId: string;
  queryKey: (string | number)[];
  readOnly?: boolean;
  replyingToId: string | null;
  onStartReply: (parentCommentId: string) => void;
  onCancelReply: () => void;
}

interface CommentNode {
  comment: Comment;
  children: CommentNode[];
}

function buildTree(comments: Comment[]): CommentNode[] {
  const byParent = new Map<string, Comment[]>();
  for (const c of comments) {
    const pid = c.parentCommentId ?? "";
    if (pid === "") continue;
    if (!byParent.has(pid)) byParent.set(pid, []);
    byParent.get(pid)!.push(c);
  }
  for (const arr of byParent.values()) {
    arr.sort((a, b) =>
      dayjs(a.createdAt).isBefore(dayjs(b.createdAt)) ? -1 : 1,
    );
  }
  function node(comment: Comment): CommentNode {
    const children = (byParent.get(comment.commentId) ?? []).map(node);
    return { comment, children };
  }
  const roots = comments
    .filter((c) => !c.parentCommentId || c.parentCommentId === "")
    .sort((a, b) => (dayjs(a.createdAt).isBefore(dayjs(b.createdAt)) ? -1 : 1));
  return roots.map(node);
}

function CommentNodeRow({
  node,
  targetType,
  targetId,
  queryKey,
  readOnly,
  replyingToId,
  onStartReply,
  onCancelReply,
  depth,
}: {
  node: CommentNode;
  targetType: "workout" | "meal";
  targetId: string;
  queryKey: (string | number)[];
  readOnly: boolean;
  replyingToId: string | null;
  onStartReply: (parentCommentId: string) => void;
  onCancelReply: () => void;
  depth: number;
}) {
  const isReply = depth > 0;
  return (
    <div className={isReply ? "ml-6 mt-2" : ""}>
      <CommentItem
        comment={node.comment}
        targetType={targetType}
        targetId={targetId}
        isReply={isReply}
        queryKey={queryKey}
        onReply={readOnly ? undefined : onStartReply}
      />
      {replyingToId === node.comment.commentId && !readOnly && (
        <div className="ml-6 mt-2">
          <CommentForm
            targetType={targetType}
            targetId={targetId}
            parentCommentId={node.comment.commentId}
            queryKey={queryKey}
            placeholder="Write a reply..."
            onCancel={onCancelReply}
          />
        </div>
      )}
      {node.children.map((child) => (
        <CommentNodeRow
          key={child.comment.commentId}
          node={child}
          targetType={targetType}
          targetId={targetId}
          queryKey={queryKey}
          readOnly={readOnly}
          replyingToId={replyingToId}
          onStartReply={onStartReply}
          onCancelReply={onCancelReply}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

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
  const tree = useMemo(() => buildTree(comments), [comments]);

  if (tree.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-4">
        No comments yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {tree.map((node) => (
        <CommentNodeRow
          key={node.comment.commentId}
          node={node}
          targetType={targetType}
          targetId={targetId}
          queryKey={queryKey}
          readOnly={readOnly}
          replyingToId={replyingToId}
          onStartReply={onStartReply}
          onCancelReply={onCancelReply}
          depth={0}
        />
      ))}
    </div>
  );
}
