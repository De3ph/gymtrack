import { useState, useCallback, useMemo } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { commentApi } from "@/api/commentApi";
import { useAuthStore } from "@/stores/authStore";
import type { Comment } from "@/types";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Button, Host } from "@expo/ui";
import { Textarea, TextareaInput } from "@/components/ui/textarea";
import { Badge, BadgeText } from "@/components/ui/badge";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Spinner } from "@/components/ui/spinner";
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
} from "@/components/ui/alert-dialog";

interface CommentSectionProps {
  targetType: "workout" | "meal";
  targetId: string | number;
  readOnly?: boolean;
}

export function CommentSection({
  targetType,
  targetId,
  readOnly = false,
}: CommentSectionProps) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const currentUserId = user?.userId;

  const queryKey = ["comments", targetType, String(targetId)];

  const { data, isLoading, isError, error, refetch } = useQuery<{
    comments: Comment[];
  }>({
    queryKey,
    queryFn: () =>
      commentApi.getByTarget(targetType, targetId) as Promise<{
        comments: Comment[];
      }>,
    enabled: !!targetId,
  });

  const comments = useMemo(() => data?.comments ?? [], [data]);

  const [draft, setDraft] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Comment | null>(null);

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => commentApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setDraft("");
      setSubmitError(null);
    },
    onError: (err: Error) => {
      setSubmitError(err.message || t("comment.form.post_failed"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => commentApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setPendingDelete(null);
    },
    onError: (err: Error) => {
      Alert.alert(t("common.errors.generic"), err.message);
    },
  });

  const handleSubmit = useCallback(() => {
    const content = draft.trim();
    if (!content) {
      setSubmitError(t("comment.form.content_required"));
      return;
    }
    createMutation.mutate({
      targetType,
      targetId: String(targetId),
      content,
    });
  }, [draft, createMutation, targetType, targetId, t]);

  const handleDelete = useCallback((comment: Comment) => {
    const id = comment.commentId;
    if (id == null) return;
    setPendingDelete(comment);
  }, []);

  const confirmDelete = useCallback(() => {
    const id = pendingDelete?.commentId;
    if (id == null) {
      setPendingDelete(null);
      return;
    }
    deleteMutation.mutate(id);
  }, [pendingDelete, deleteMutation]);

  const renderComment = useCallback(
    ({ item }: { item: Comment }) => {
      const isOwn = currentUserId != null && item.authorId === currentUserId;
      const isTrainer = item.authorRole === "trainer";
      const roleLabel =
        item.authorRole === "trainer" ? "Trainer" : "Athlete";
      const timeLabel = item.createdAt
        ? new Date(item.createdAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "";
      return (
        <Box className="rounded-[10px] border border-border bg-card p-3">
          <HStack className="mb-1.5 items-center justify-between">
            <Badge
              className={
                isTrainer
                  ? "rounded-full bg-primary-surface px-2 py-0.5"
                  : "rounded-full bg-success-surface px-2 py-0.5"
              }
            >
              <BadgeText
                className={
                  isTrainer
                    ? "text-[11px] font-bold capitalize text-primary-text"
                    : "text-[11px] font-bold capitalize text-success-text"
                }
              >
                {roleLabel}
              </BadgeText>
            </Badge>
            <Text className="text-[11px] text-text-tertiary">{timeLabel}</Text>
          </HStack>
          <Text className="text-sm leading-5 text-text">{item.content}</Text>
          {item.editedAt ? (
            <Text className="mt-1 text-[11px] italic text-text-tertiary">
              {t("comment.item.edited_label")}
            </Text>
          ) : null}
          {!readOnly && isOwn && (
            <Pressable
              onPress={() => handleDelete(item)}
              className="mt-1.5 self-end"
            >
              <Text className="text-xs font-semibold text-danger">
                {t("comment.item.delete")}
              </Text>
            </Pressable>
          )}
        </Box>
      );
    },
    [currentUserId, readOnly, handleDelete, t]
  );

  const countLabel = t("comment.list.comments_count").replace(
    "{count}",
    String(comments.length)
  );
  return (
    <KeyboardAvoidingView
      className="mt-4"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text className="mb-2.5 text-sm font-bold uppercase tracking-[1px] text-text-secondary">
        {countLabel}
      </Text>

      {isLoading ? (
        <Box className="my-3 items-center">
          <Spinner />
        </Box>
      ) : isError ? (
        <VStack space="sm" className="items-center py-3">
          <Box className="mb-4 w-full rounded border-l-4 border-l-danger bg-danger-surface p-3">
            <Text className="text-sm font-medium text-danger-text">
              {(error as Error)?.message || t("comment.list.load_failed")}
            </Text>
          </Box>
          <Host matchContents>
            <Button
              label={t("common.actions.retry")}
              onPress={() => refetch()}
            />
          </Host>
        </VStack>
      ) : (
        <FlashList
          data={comments}
          renderItem={renderComment}
          keyExtractor={(item: Comment) =>
            String(item.commentId ?? item.createdAt ?? "")
          }
          scrollEnabled={false}
          ListEmptyComponent={
            <Text className="py-4 text-center text-[13px] text-text-tertiary">
              {t("comment.list.no_comments")}
            </Text>
          }
          contentContainerStyle={{ gap: 8 }}
        />
      )}

      {!readOnly && (
        <HStack space="sm" className="mt-3 items-end">
          <Box className="flex-1">
            <Textarea className="min-h-[44px] rounded-lg border-border-strong bg-card">
              <TextareaInput
                value={draft}
                onChangeText={setDraft}
                placeholder={t("comment.form.comment")}
                editable={!createMutation.isPending}
              />
            </Textarea>
          </Box>
          <Host matchContents>
            <Button
              label={t("comment.form.submit")}
              onPress={createMutation.isPending ? undefined : handleSubmit}
              disabled={createMutation.isPending}
            />
          </Host>
        </HStack>
      )}

      {createMutation.isPending && !readOnly ? (
        <Text className="mt-1.5 text-xs text-text-tertiary">
          {t("comment.form.submitting")}
        </Text>
      ) : null}

      {submitError ? (
        <Box className="mb-4 mt-1.5 rounded border-l-4 border-l-danger bg-danger-surface p-3">
          <Text className="text-sm font-medium text-danger-text">
            {submitError}
          </Text>
        </Box>
      ) : null}

      <AlertDialog
        isOpen={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
      >
        <AlertDialogBackdrop />
        <AlertDialogContent>
          <AlertDialogHeader>
            <Text className="text-lg font-bold text-text">
              {t("comment.item.delete")}
            </Text>
          </AlertDialogHeader>
          <AlertDialogBody>
            <Text className="text-sm text-text-secondary">
              {t("comment.item.delete_confirm")}
            </Text>
          </AlertDialogBody>
          <AlertDialogFooter>
            <Host matchContents>
              <Button
                label={t("common.actions.cancel")}
                variant="outlined"
                onPress={() => setPendingDelete(null)}
              />
            </Host>
            <Host matchContents>
              <Button
                label={t("common.actions.delete")}
                style={{ backgroundColor: "#dc2626" }}
                onPress={confirmDelete}
                disabled={deleteMutation.isPending}
              />
            </Host>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </KeyboardAvoidingView>
  );
}
