import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { relationshipApi } from "@/api/relationshipApi";
import { useThemeColors } from "@/components/useThemeColors";
import type { ThemeColors } from "@/constants/Colors";

interface Client {
  userId?: number;
  username?: string;
  email?: string;
  profile?: { name?: string };
}

export function ClientsScreen() {
  const c = useThemeColors();
  const router = useRouter();
  const styles = createStyles(c);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["clients"],
    queryFn: () => relationshipApi.getMyClients(),
  });

  const clients: Client[] = (data as { clients?: Client[] })?.clients ?? [];

  const { mutate: generateCode, isPending: generating } = useMutation({
    mutationFn: () => relationshipApi.generateInvitation(),
    onSuccess: (res) => {
      const invite = (res as { invitation?: { code?: string; expiresAt?: string } })?.invitation;
      if (invite?.code) {
        Alert.alert("Invitation Code", `Share this code with your athlete:\n\n${invite.code}\n\nExpires: ${invite.expiresAt ?? "7 days"}`, [
          { text: "OK" },
        ]);
      }
    },
    onError: (err: Error) => {
      Alert.alert("Error", err.message || "Failed to generate invitation");
    },
  });

  const renderItem = ({ item }: { item: Client }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/trainer/client/${item.username}`)}
      activeOpacity={0.7}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{(item.username ?? "?")[0].toUpperCase()}</Text>
      </View>
      <View>
        <Text style={styles.clientName}>{item.profile?.name || item.username}</Text>
        <Text style={styles.clientUsername}>@{item.username}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.flex}>
      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={c.accent} /></View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Failed to load clients</Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryButton}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={clients}
          keyExtractor={(item) => String(item.userId ?? "")}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
          ListHeaderComponent={
            <TouchableOpacity
              style={styles.inviteButton}
              onPress={() => generateCode()}
              disabled={generating}
              activeOpacity={0.7}
            >
              {generating ? (
                <ActivityIndicator color={c.onAccent} size="small" />
              ) : (
                <Text style={styles.inviteText}>Generate Invite Code</Text>
              )}
            </TouchableOpacity>
          }
          ListEmptyComponent={<View style={styles.center}><Text style={styles.emptyText}>No clients yet</Text></View>}
        />
      )}
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.background },
    center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
    list: { padding: 16, gap: 10 },
    card: { backgroundColor: c.card, borderRadius: 12, padding: 14, flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 0.5, borderColor: c.border },
    avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: c.accent, alignItems: "center", justifyContent: "center" },
    avatarText: { color: c.onAccent, fontSize: 20, fontWeight: "700" },
    clientName: { fontSize: 16, fontWeight: "700", color: c.text },
    clientUsername: { fontSize: 13, color: c.textSecondary, marginTop: 2 },
    emptyText: { fontSize: 15, color: c.textSecondary },
    errorText: { fontSize: 15, color: c.danger, marginBottom: 12 },
    retryButton: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: c.accent, borderRadius: 8 },
    retryText: { color: c.onAccent, fontWeight: "600" },
    inviteButton: {
      backgroundColor: c.invite, paddingVertical: 14, borderRadius: 10,
      alignItems: "center", marginBottom: 12,
    },
    inviteText: { color: c.onAccent, fontWeight: "700", fontSize: 15 },
  });
}
