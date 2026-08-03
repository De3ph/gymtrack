import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { commentApi } from "@/api/commentApi";
import { useAuthStore } from "@/stores/authStore";
import type { Comment } from "@/types";

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

  const comments: Comment[] = data?.comments ?? [];

  const [draft, setDraft] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

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

  const handleDelete = useCallback(
    (comment: Comment) => {
      const id = comment.commentId;
      if (id == null) return;
      Alert.alert(t("comment.item.delete"), t("comment.item.delete_confirm"), [
        { text: t("common.actions.cancel"), style: "cancel" },
        {
          text: t("common.actions.delete"),
          style: "destructive",
          onPress: () => deleteMutation.mutate(id),
        },
      ]);
    },
    [t, deleteMutation]
  );

  const renderComment = useCallback(
    ({ item }: { item: Comment }) => {
      const isOwn = currentUserId != null && item.authorId === currentUserId;
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
        <View style={styles.commentCard}>
          <View style={styles.commentHeader}>
            <View
              style={[
                styles.roleBadge,
                item.authorRole === "trainer"
                  ? styles.roleBadgeTrainer
                  : styles.roleBadgeAthlete,
              ]}
            >
              <Text style={styles.roleBadgeText}>{roleLabel}</Text>
            </View>
            <Text style={styles.commentTime}>{timeLabel}</Text>
          </View>
          <Text style={styles.commentContent}>{item.content}</Text>
          {item.editedAt ? (
            <Text style={styles.editedLabel}>
              {t("comment.item.edited_label")}
            </Text>
          ) : null}
          {!readOnly && isOwn && (
            <TouchableOpacity
              style={styles.deleteLink}
              onPress={() => handleDelete(item)}
              activeOpacity={0.7}
            >
              <Text style={styles.deleteLinkText}>
                {t("comment.item.delete")}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      );
    },
    [currentUserId, readOnly, handleDelete, t]
  );

  const keyExtractor = useCallback(
    (item: Comment) => String(item.commentId ?? item.createdAt ?? ""),
    []
  );

  const countLabel = t("comment.list.comments_count").replace(
    "{count}",
    String(comments.length)
  );
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.sectionTitle}>{countLabel}</Text>

      {isLoading ? (
        <ActivityIndicator size="small" color="#2563eb" style={styles.loader} />
      ) : isError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>
            {(error as Error)?.message || t("comment.list.load_failed")}
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>{t("common.actions.retry")}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={comments}
          renderItem={renderComment}
          keyExtractor={keyExtractor}
          scrollEnabled={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {t("comment.list.no_comments")}
            </Text>
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      {!readOnly && (
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder={t("comment.form.comment")}
            placeholderTextColor="#9ca3af"
            multiline
          />
          <TouchableOpacity
            style={[
              styles.submitButton,
              createMutation.isPending && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={createMutation.isPending}
            activeOpacity={0.7}
          >
            <Text style={styles.submitButtonText}>
              {createMutation.isPending
                ? t("comment.form.submitting")
                : t("comment.form.submit")}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {submitError ? (
        <Text style={styles.submitError}>{submitError}</Text>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 16 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  },
  loader: { marginVertical: 12 },
  listContent: { gap: 8 },
  commentCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    borderWidth: 0.5,
    borderColor: "#e5e7eb",
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  roleBadgeTrainer: { backgroundColor: "#dbeafe" },
  roleBadgeAthlete: { backgroundColor: "#dcfce7" },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1d4ed8",
    textTransform: "capitalize",
  },
  commentTime: { fontSize: 11, color: "#9ca3af" },
  commentContent: { fontSize: 14, color: "#111827", lineHeight: 20 },
  editedLabel: {
    fontSize: 11,
    color: "#9ca3af",
    fontStyle: "italic",
    marginTop: 4,
  },
  deleteLink: { alignSelf: "flex-end", marginTop: 6 },
  deleteLinkText: { fontSize: 12, color: "#ef4444", fontWeight: "600" },
  emptyText: {
    textAlign: "center",
    color: "#9ca3af",
    fontSize: 13,
    paddingVertical: 16,
  },
  errorBox: { alignItems: "center", paddingVertical: 12 },
  errorText: { fontSize: 13, color: "#ef4444", marginBottom: 8 },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#2563eb",
    borderRadius: 8,
  },
  retryText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  inputRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#fff",
    minHeight: 44,
    textAlignVertical: "top",
  },
  submitButton: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: "center",
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  submitError: { fontSize: 12, color: "#ef4444", marginTop: 6 },
});
