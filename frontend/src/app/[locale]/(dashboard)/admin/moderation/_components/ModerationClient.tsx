"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/api/adminApi";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageSquare, Trash2 } from "lucide-react";

function formatCommentDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString();
}

function CommentRow({
  comment,
  onDelete,
  isDeleting,
}: {
  comment: { commentId: string; content: string; authorId: string; authorRole: string; targetType: string; targetId: string; createdAt: string };
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  return (
    <TableRow key={comment.commentId}>
      <TableCell className="max-w-md truncate">{comment.content}</TableCell>
      <TableCell>
        #{comment.authorId}{" "}
        <Badge variant="outline" className="ml-2 text-xs">
          {comment.authorRole}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant="secondary" className="text-xs">
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
          <Trash2 className="h-4 w-4" />
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
    mutationFn: (commentId) => adminApi.deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-comments"] });
    },
  });

  const handleDelete = useCallback(
    (commentId) => {
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
        <h1 className="text-3xl font-bold tracking-tight">Moderation</h1>
        <p className="mt-1 text-muted-foreground">Review and manage user comments</p>
      </div>
      <div className="flex items-center gap-4">
        <Select value={targetType} onValueChange={(v) => { setTargetType(v); setPage(0); }}>
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
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><MessageSquare className="h-4 w-4" />Comments</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
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
              <div className="flex items-center justify-between border-t px-4 py-3">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
                <span className="text-sm text-muted-foreground">Page {page + 1} of {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>Next</Button>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-muted-foreground"><MessageSquare className="mx-auto mb-2 h-8 w-8 opacity-40" /><p>No comments to moderate</p></div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
