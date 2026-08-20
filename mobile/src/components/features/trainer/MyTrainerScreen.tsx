import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { relationshipApi } from "@/api/relationshipApi";
import { useRouter } from "expo-router";
import { useThemeColors } from "@/components/useThemeColors";
import type { ThemeColors } from "@/constants/Colors";

export function MyTrainerScreen() {
  const c = useThemeColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const styles = createStyles(c);
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["myTrainer"],
    queryFn: () => relationshipApi.getMyTrainer(),
  });

  const { mutate: terminate, isPending: terminating } = useMutation({
    mutationFn: (id: number) => relationshipApi.terminateRelationship(id),
    onSuccess: () => router.back(),
  });

  const [inviteCode, setInviteCode] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const { mutate: acceptInvite, isPending: accepting } = useMutation({
    mutationFn: (code: string) => relationshipApi.acceptInvitation(code),
    onSuccess: () => {
      setInviteCode("");
      setShowSuccess(true);
      queryClient.invalidateQueries({ queryKey: ["myTrainer"] });
      Alert.alert("Success", "Invitation accepted! You are now connected with your trainer.");
    },
    onError: (err: Error) => {
      Alert.alert("Error", err.message || "Failed to accept invitation");
    },
  });

  // Clear success flag once the refetch triggered by invalidation completes
  useEffect(() => {
    if (showSuccess && !isFetching) setShowSuccess(false);
  }, [showSuccess, isFetching]);

  if (isLoading || showSuccess) return <View style={styles.center}><ActivityIndicator size="large" color={c.accent} /></View>;
  if (isError || !data) return (
    <View style={styles.center}>
      <Text style={styles.emptyText}>No trainer assigned yet</Text>
      <View style={styles.inviteSection}>
        <Text style={styles.inviteLabel}>Have an invite code?</Text>
        <TextInput
          style={styles.inviteInput}
          value={inviteCode}
          onChangeText={setInviteCode}
          placeholder="Enter 8-character code"
          placeholderTextColor={c.textTertiary}
          maxLength={8}
          autoCapitalize="characters"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[styles.acceptButton, (!inviteCode.trim() || accepting) && styles.acceptButtonDisabled]}
          onPress={() => acceptInvite(inviteCode.trim())}
          disabled={!inviteCode.trim() || accepting}
        >
          {accepting ? (
            <ActivityIndicator color={c.onAccent} size="small" />
          ) : (
            <Text style={styles.acceptText}>Accept Invitation</Text>
          )}
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={() => refetch()} style={styles.retryButton}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
    </View>
  );

  const trainer = (data as { trainer?: { relationshipId?: number; username?: string; email?: string; profile?: { name?: string; bio?: string; specializations?: string } } })?.trainer;
  if (!trainer) return <View style={styles.center}><Text style={styles.emptyText}>No trainer assigned</Text></View>;

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{(trainer.username ?? "?")[0].toUpperCase()}</Text></View>
        <Text style={styles.name}>{trainer.profile?.name || trainer.username}</Text>
        {trainer.profile?.bio ? <Text style={styles.bio}>{trainer.profile.bio}</Text> : null}
      </View>
      {trainer.profile?.specializations ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Specializations</Text>
          <View style={styles.tags}>
            {trainer.profile.specializations.split(",").map((s: string, i: number) => (
              <View key={i} style={styles.tag}><Text style={styles.tagText}>{s.trim()}</Text></View>
            ))}
          </View>
        </View>
      ) : null}
      <View style={styles.dangerSection}>
        <TouchableOpacity
          style={styles.terminateButton}
          onPress={() => {
            Alert.alert("Terminate Relationship", "Are you sure?", [
              { text: "Cancel", style: "cancel" },
              { text: "Terminate", style: "destructive", onPress: () => trainer.relationshipId && terminate(trainer.relationshipId) },
            ]);
          }}
          disabled={terminating}
        >
          <Text style={styles.terminateText}>{terminating ? "Terminating..." : "Terminate Relationship"}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.background },
    container: { padding: 24, paddingBottom: 48 },
    center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
    header: { alignItems: "center", marginBottom: 24 },
    avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: c.accent, alignItems: "center", justifyContent: "center", marginBottom: 12 },
    avatarText: { color: c.onAccent, fontSize: 32, fontWeight: "800" },
    name: { fontSize: 24, fontWeight: "700", color: c.text, marginBottom: 6 },
    bio: { fontSize: 14, color: c.textSecondary, textAlign: "center" },
    section: { backgroundColor: c.card, borderRadius: 12, padding: 16, marginBottom: 16 },
    sectionTitle: { fontSize: 14, fontWeight: "700", color: c.textSecondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 },
    tags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    tag: { backgroundColor: c.accentSurface, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    tagText: { fontSize: 12, fontWeight: "600", color: c.accentOnLight },
    dangerSection: { marginTop: 8 },
    terminateButton: { paddingVertical: 14, borderRadius: 8, borderWidth: 1.5, borderColor: c.danger, alignItems: "center" },
    terminateText: { fontSize: 15, fontWeight: "700", color: c.danger },
    emptyText: { fontSize: 16, color: c.textSecondary, marginBottom: 12 },
    retryButton: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: c.accent, borderRadius: 8 },
    retryText: { color: c.onAccent, fontWeight: "600" },
    inviteSection: {
      width: "100%", maxWidth: 320, backgroundColor: c.card, borderRadius: 12,
      padding: 16, marginBottom: 16, borderWidth: 1, borderColor: c.border,
    },
    inviteLabel: { fontSize: 14, fontWeight: "600", color: c.textBody, marginBottom: 10, textAlign: "center" },
    inviteInput: {
      backgroundColor: c.background, borderWidth: 1, borderColor: c.borderStrong,
      borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, fontSize: 18,
      color: c.text, textAlign: "center", letterSpacing: 4, fontWeight: "700",
      marginBottom: 12,
    },
    acceptButton: {
      backgroundColor: c.invite, paddingVertical: 12, borderRadius: 8, alignItems: "center",
    },
    acceptButtonDisabled: { backgroundColor: c.inviteDisabled },
    acceptText: { color: c.onAccent, fontWeight: "700", fontSize: 14 },
  });
}
