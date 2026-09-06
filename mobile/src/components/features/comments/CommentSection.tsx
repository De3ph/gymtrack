import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { commentApi } from "@/api/commentApi";
import { useAuthStore } from "@/stores/authStore";
import { useThemeColors } from "@/components/useThemeColors";
import type { ThemeColors } from "@/constants/Colors";
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
  const c = useThemeColors();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const currentUserId = user?.userId;

  const styles = useMemo(() => createStyles(c), [c]);

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
            <Pressable
              style={styles.deleteLink}
              onPress={() => handleDelete(item)}
            >
              <Text style={styles.deleteLinkText}>
                {t("comment.item.delete")}
              </Text>
            </Pressable>
          )}
        </View>
      );
    },
    [currentUserId, readOnly, handleDelete, t, styles]
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
        <ActivityIndicator size="small" color={c.accent} style={styles.loader} />
      ) : isError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>
            {(error as Error)?.message || t("comment.list.load_failed")}
          </Text>
          <Pressable
            onPress={() => refetch()}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>{t("common.actions.retry")}</Text>
          </Pressable>
        </View>
      ) : (
        <FlashList
          data={comments}
          renderItem={renderComment}
          keyExtractor={(item: Comment) =>
            String(item.commentId ?? item.createdAt ?? "")
          }
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
            placeholderTextColor={c.textTertiary}
            multiline
          />
          <Pressable
            style={[
              styles.submitButton,
              createMutation.isPending && styles.submitButtonDisabled,
            ]}
            onPress={createMutation.isPending ? undefined : handleSubmit}
          >
            <Text style={styles.submitButtonText}>
              {createMutation.isPending
                ? t("comment.form.submitting")
                : t("comment.form.submit")}
            </Text>
          </Pressable>
        </View>
      )}

      {submitError ? (
        <Text style={styles.submitError}>{submitError}</Text>
      ) : null}
    </KeyboardAvoidingView>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { marginTop: 16 },
    sectionTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: c.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 1,
      marginBottom: 10,
    },
    loader: { marginVertical: 12 },
    listContent: { gap: 8 },
    commentCard: {
      backgroundColor: c.card,
      borderRadius: 10,
      padding: 12,
      borderWidth: 0.5,
      borderColor: c.border,
    },
    commentHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 6,
    },
    roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    roleBadgeTrainer: { backgroundColor: c.accentSurface },
    roleBadgeAthlete: { backgroundColor: c.successSurface },
    roleBadgeText: {
      fontSize: 11,
      fontWeight: "700",
      color: c.accentOnLight,
      textTransform: "capitalize",
    },
    commentTime: { fontSize: 11, color: c.textTertiary },
    commentContent: { fontSize: 14, color: c.text, lineHeight: 20 },
    editedLabel: {
      fontSize: 11,
      color: c.textTertiary,
      fontStyle: "italic",
      marginTop: 4,
    },
    deleteLink: { alignSelf: "flex-end", marginTop: 6 },
    deleteLinkText: { fontSize: 12, color: c.danger, fontWeight: "600" },
    emptyText: {
      textAlign: "center",
      color: c.textTertiary,
      fontSize: 13,
      paddingVertical: 16,
    },
    errorBox: { alignItems: "center", paddingVertical: 12 },
    errorText: { fontSize: 13, color: c.danger, marginBottom: 8 },
    retryButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: c.accent,
      borderRadius: 8,
    },
    retryText: { color: c.onAccent, fontWeight: "600", fontSize: 13 },
    inputRow: {
      flexDirection: "row",
      gap: 8,
      marginTop: 12,
      alignItems: "flex-end",
    },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: c.borderStrong,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: c.text,
      backgroundColor: c.card,
      minHeight: 44,
      textAlignVertical: "top",
    },
    submitButton: {
      backgroundColor: c.accent,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 8,
      justifyContent: "center",
    },
    submitButtonDisabled: { opacity: 0.5 },
    submitButtonText: { color: c.onAccent, fontWeight: "600", fontSize: 14 },
    submitError: { fontSize: 12, color: c.danger, marginTop: 6 },
  });
}