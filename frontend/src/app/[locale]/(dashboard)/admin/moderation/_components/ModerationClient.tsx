"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/api/adminApi";
import type { AdminComment } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageSquare, Trash2 } from "lucide-react";

const badgeRegister = "h-auto rounded-none px-2.5 py-0.5";

function formatCommentDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString();
}

function CommentRow({
  comment,
  onDelete,
  isDeleting,
}: {
  comment: AdminComment;
  onDelete: (id: number) => void;
  isDeleting: boolean;
}) {
  return (
    <TableRow key={comment.commentId}>
      <TableCell className="max-w-md truncate">{comment.content}</TableCell>
      <TableCell>
        #{comment.authorId}{" "}
        <Badge variant="outline" className={badgeRegister}>
          {comment.authorRole}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant="secondary" className={badgeRegister}>
          {comment.targetType}
        </Badge>{" "}
        #{comment.targetId}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {formatCommentDate(comment.createdAt)}
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive"
          onClick={() => onDelete(comment.commentId)}
          disabled={isDeleting}
        >
          <Trash2 className="size-5" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
export default function ModerationClient() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [targetType, setTargetType] = useState("all");
  const pageSize = 25;
  const targetTypeParam = targetType === "all" ? "" : targetType;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-comments", page, targetTypeParam],
    queryFn: () =>
      adminApi.getComments({
        limit: pageSize,
        offset: page * pageSize,
        targetType: targetTypeParam,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId: number) => adminApi.deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-comments"] });
    },
  });

  const handleDelete = useCallback(
    (commentId: number) => {
      if (confirm("Delete this comment permanently?")) {
        deleteMutation.mutate(commentId);
      }
    },
    [deleteMutation],
  );

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-mono text-3xl leading-tight tracking-[-0.04em]">
          Moderation
        </h1>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Review and manage user comments
        </p>
      </div>
      <div className="flex items-center gap-4">
        <Select value={targetType} onValueChange={(v) => { setTargetType(v ?? "all"); setPage(0); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Target type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="workout">Workouts</SelectItem>
            <SelectItem value="meal">Meals</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{data ? `${data.total} comment${data.total !== 1 ? "s" : ""}` : ""}</span>
      </div>
      <div className="border border-border">
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-mono text-[10px] uppercase leading-3 tracking-[0.18em] text-muted-foreground">
            Comments
          </h2>
          <MessageSquare
            className="size-5 text-muted-foreground"
            aria-hidden="true"
          />
        </header>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner className="size-6 text-muted-foreground" />
          </div>
        ) : data && data.comments.length > 0 ? (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Content</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.comments.map((comment) => (
                  <CommentRow
                    key={comment.commentId}
                    comment={comment}
                    onDelete={handleDelete}
                    isDeleting={deleteMutation.isPending}
                  />
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
              <span className="text-sm text-muted-foreground">Page {page + 1} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          </>
        ) : (
          <Empty className="rounded-none border-0 p-12">
            <EmptyHeader>
              <EmptyMedia variant="icon" className="rounded-none">
                <MessageSquare className="size-5" aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle className="font-mono text-base uppercase tracking-[0.18em]">
                No comments to moderate
              </EmptyTitle>
              <EmptyDescription>
                Comments appear here as athletes and trainers post them.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>
    </div>
  );
}
