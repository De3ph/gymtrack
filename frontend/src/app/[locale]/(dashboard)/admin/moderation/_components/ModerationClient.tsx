"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { adminApi } from "@/lib/api/adminApi";
import { qk } from "@/lib/query-keys";
import { ApiErrorHandler } from "@/lib/error-handler";
import { DataError } from "@/components/features/DataError";
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

export default function ModerationClient() {
  const t = useTranslations("admin.moderation");
  const tRoles = useTranslations("admin.roles");
  const tActions = useTranslations("common.actions");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [targetType, setTargetType] = useState("all");
  const pageSize = 25;
  const targetTypeParam = targetType === "all" ? "" : targetType;

  const roleLabel = useCallback(
    (role: string) =>
      role === "admin" || role === "trainer" || role === "athlete"
        ? tRoles(role)
        : role,
    [tRoles],
  );

  const targetLabel = useCallback(
    (target: string) =>
      target === "workout" || target === "meal"
        ? t(`target_labels.${target}`)
        : target,
    [t],
  );

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: qk.admin.comments.page(page, targetTypeParam),
    queryFn: () =>
      adminApi.getComments({
        limit: pageSize,
        offset: page * pageSize,
        targetType: targetTypeParam,
      }),
    // Keep the previous page visible while the next one loads.
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId: number) => adminApi.deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.admin.comments.all });
    },
  });

  const handleDelete = useCallback(
    (commentId: number) => {
      if (confirm(t("delete_confirm"))) {
        deleteMutation.mutate(commentId);
      }
    },
    [deleteMutation, t],
  );

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-mono text-3xl leading-tight tracking-[-0.04em]">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {t("description")}
        </p>
      </div>
      <div className="flex items-center gap-4">
        <Select value={targetType} onValueChange={(v) => { setTargetType(v ?? "all"); setPage(0); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("target_type")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("all_types")}</SelectItem>
            <SelectItem value="workout">{t("workouts")}</SelectItem>
            <SelectItem value="meal">{t("meals")}</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {data ? t("count", { count: data.total }) : ""}
        </span>
      </div>
      <div className="border border-border">
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-mono text-[10px] uppercase leading-3 tracking-[0.18em] text-muted-foreground">
            {t("list_title")}
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
        ) : error ? (
          <div className="p-6">
            <DataError
              message={ApiErrorHandler.handle(error)}
              onRetry={() => refetch()}
            />
          </div>
        ) : data && data.comments.length > 0 ? (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("table.content")}</TableHead>
                  <TableHead>{t("table.author")}</TableHead>
                  <TableHead>{t("table.target")}</TableHead>
                  <TableHead>{t("table.date")}</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.comments.map((comment: AdminComment) => (
                  <TableRow key={comment.commentId}>
                    <TableCell className="max-w-md truncate">{comment.content}</TableCell>
                    <TableCell>
                      #{comment.authorId}{" "}
                      <Badge variant="outline" className={badgeRegister}>
                        {roleLabel(comment.authorRole)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={badgeRegister}>
                        {targetLabel(comment.targetType)}
                      </Badge>{" "}
                      #{comment.targetId}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(comment.createdAt).toLocaleDateString(locale)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => handleDelete(comment.commentId)}
                        disabled={deleteMutation.isPending}
                        aria-label={t("delete_aria")}
                      >
                        <Trash2 className="size-5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                {tActions("previous")}
              </Button>
              <span className="text-sm text-muted-foreground">
                {t("pagination.page_of", { page: page + 1, pages: totalPages })}
              </span>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                {tActions("next")}
              </Button>
            </div>
          </>
        ) : (
          <Empty className="rounded-none border-0 p-12">
            <EmptyHeader>
              <EmptyMedia variant="icon" className="rounded-none">
                <MessageSquare className="size-5" aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle className="font-mono text-base uppercase tracking-[0.18em]">
                {t("empty.title")}
              </EmptyTitle>
              <EmptyDescription>
                {t("empty.description")}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>
    </div>
  );
}
